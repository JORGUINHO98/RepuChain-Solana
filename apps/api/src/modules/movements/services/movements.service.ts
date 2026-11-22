import { ensureBatchEvidence,enqueueMovement } from "../../blockchain/enqueue";
import { ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { DatabaseService } from "../../../database/database.service";
import { Prisma } from "@repuchain/database";
import { sha256 } from "@repuchain/security";
import type { AuthenticatedUser } from "@repuchain/shared-types";
import type { MovementInput, InventoryQuery } from "@repuchain/validation";
import { audit } from "../../audit/services/audit";
import { serializable } from "../../../common/transaction";
@Injectable()
export class MovementsService {
  constructor(@Inject(DatabaseService) private readonly db:DatabaseService) {}
  async list(actor:AuthenticatedUser,query:InventoryQuery) {
    const where = {companyId:actor.companyId,batchId:query.batchId,
      ...(query.warehouseId ? {OR:[{sourceWarehouseId:query.warehouseId},{destinationWarehouseId:query.warehouseId}]} : {}),
      ...(query.search ? {reason:{contains:query.search,mode:"insensitive" as const}} : {})};
    const [items,total]=await this.db.client.$transaction([
      this.db.client.inventoryMovement.findMany({where,include:{batch:{include:{product:true}},source:true,destination:true},orderBy:[{createdAt:"desc"},{id:"desc"}],skip:(query.page-1)*query.limit,take:query.limit}),
      this.db.client.inventoryMovement.count({where}),
    ]);
    return {items,total,page:query.page,limit:query.limit};
  }
  async create(actor:AuthenticatedUser,input:MovementInput,idempotencyKey:string) {
    // Fixed field order, normalized DTO. This fingerprint serves idempotency only,
    // and is NOT an on-chain evidence hash.
    const requestHash=sha256(JSON.stringify([
      actor.id,input.batchId,input.type,input.quantity,input.sourceWarehouseId ?? null,
      input.destinationWarehouseId ?? null,input.reason,
    ]));
    const key={companyId:actor.companyId,idempotencyKey};
    const match=(existing:{requestHash:string})=>{
      if(existing.requestHash!==requestHash) throw new ConflictException("La clave de idempotencia ya se usó para otra solicitud");
    };
    try {
      return await serializable(this.db.client,tx=>this.createInTransaction(tx,actor,input,idempotencyKey));
    } catch(error){
      if(error instanceof Prisma.PrismaClientKnownRequestError && error.code==="P2002"){
        const prior=await this.db.client.inventoryMovement.findUnique({where:{companyId_idempotencyKey:key}});
        if(prior){match(prior);return prior;}
      }
      throw error;
    }
  }
  async createInTransaction(tx:Prisma.TransactionClient,actor:AuthenticatedUser,input:MovementInput,idempotencyKey:string) {
    const requestHash=sha256(JSON.stringify([
      actor.id,input.batchId,input.type,input.quantity,input.sourceWarehouseId ?? null,
      input.destinationWarehouseId ?? null,input.reason,
    ]));
    const key={companyId:actor.companyId,idempotencyKey};
    const match=(existing:{requestHash:string})=>{
      if(existing.requestHash!==requestHash) throw new ConflictException("La clave de idempotencia ya se usó para otra solicitud");
    };

        const prior=await tx.inventoryMovement.findUnique({where:{companyId_idempotencyKey:key}});
        if(prior){match(prior);return prior;}
        await tx.$queryRaw`SELECT id FROM inventory_batches WHERE id = ${input.batchId}::uuid AND "companyId" = ${actor.companyId}::uuid FOR UPDATE`;
        const batch=await tx.inventoryBatch.findFirst({where:{id:input.batchId,companyId:actor.companyId},include:{product:true}});
        if(!batch) throw new NotFoundException("Lote no encontrado");
        await ensureBatchEvidence(tx,batch);
        if(input.type==="IN"&&!batch.product.active) throw new ConflictException("El producto está desactivado");
        for(const id of [input.sourceWarehouseId,input.destinationWarehouseId].filter(Boolean)){
          if(!await tx.warehouse.findFirst({where:{id,companyId:actor.companyId,active:true}})) throw new NotFoundException("Almacén activo no encontrado");
        }
        if(input.sourceWarehouseId){
          const removed=await tx.stock.updateMany({where:{companyId:actor.companyId,batchId:input.batchId,warehouseId:input.sourceWarehouseId,quantity:{gte:input.quantity}},data:{quantity:{decrement:input.quantity}}});
          if(removed.count!==1) throw new ConflictException("Existencias insuficientes");
        }
        if(input.destinationWarehouseId){
          const stockKey={companyId:actor.companyId,batchId:input.batchId,warehouseId:input.destinationWarehouseId};
          const current=await tx.stock.findUnique({where:{companyId_batchId_warehouseId:stockKey}});
          if((current?.quantity??0)+input.quantity>2147483647) throw new ConflictException("Se supera la capacidad de unidades del almacén");
          await tx.stock.upsert({where:{companyId_batchId_warehouseId:stockKey},create:{...stockKey,quantity:input.quantity},update:{quantity:{increment:input.quantity}}});
        }
        const movement=await tx.inventoryMovement.create({data:{...input,companyId:actor.companyId,actorId:actor.id,idempotencyKey,requestHash}});
        await enqueueMovement(tx,movement);
        await audit(tx,actor,"inventory."+input.type.toLowerCase(),movement.id,{batchId:input.batchId,quantity:input.quantity});
        return movement;

  }
}