import {Inject,Injectable,ConflictException,NotFoundException} from "@nestjs/common";
import {randomUUID} from "node:crypto";
import {Prisma} from "@repuchain/database";
import {sha256} from "@repuchain/security";
import type {AuthenticatedUser} from "@repuchain/shared-types";
import type {TradeInput,ListQuery} from "@repuchain/validation";
import {DatabaseService} from "../../database/database.service";
import {serializable} from "../../common/transaction";
import {MovementsService} from "../movements/services/movements.service";
import {audit} from "../audit/services/audit";
const include={warehouse:true,supplier:true,lines:{include:{batch:{include:{product:true}}}}} as const;
@Injectable()
export class TradeService {
  constructor(@Inject(DatabaseService) private readonly db:DatabaseService,@Inject(MovementsService) private readonly movements:MovementsService){}
  async list(actor:AuthenticatedUser,type:string,q:ListQuery){
    const where={companyId:actor.companyId,type,...(q.search?{OR:[{reference:{contains:q.search,mode:"insensitive" as const}},{counterparty:{contains:q.search,mode:"insensitive" as const}}]}:{})};
    const [items,total]=await this.db.client.$transaction([
      this.db.client.tradeDocument.findMany({where,include,orderBy:[{createdAt:"desc"},{id:"desc"}],skip:(q.page-1)*q.limit,take:q.limit}),
      this.db.client.tradeDocument.count({where}),
    ]);
    return {items,total,page:q.page,limit:q.limit};
  }
  async create(actor:AuthenticatedUser,type:"PURCHASE"|"SALE",input:TradeInput,key:string){
    const requestHash=sha256(JSON.stringify({actor:actor.id,type,...input}));
    const match=(row:{requestHash:string})=>{if(row.requestHash!==requestHash)throw new ConflictException("La clave de idempotencia ya se utilizó para otra operación");};
    try{return await serializable(this.db.client,async tx=>{
      const prior=await tx.tradeDocument.findUnique({where:{companyId_idempotencyKey:{companyId:actor.companyId,idempotencyKey:key}},include});
      if(prior){match(prior);return prior;}
      if(!await tx.warehouse.findFirst({where:{id:input.warehouseId,companyId:actor.companyId,active:true}}))throw new NotFoundException("Almacén activo no encontrado");
      const supplier=input.supplierId?await tx.supplier.findFirst({where:{id:input.supplierId,companyId:actor.companyId,active:true}}):null;
      if(type==="PURCHASE"&&!supplier)throw new NotFoundException("Proveedor activo no encontrado");
      const lines=[...input.lines].sort((a,b)=>a.batchId.localeCompare(b.batchId));
      const total=lines.reduce((sum,line)=>sum.add(new Prisma.Decimal(line.unitPrice).mul(line.quantity)),new Prisma.Decimal(0));
      const doc=await tx.tradeDocument.create({data:{companyId:actor.companyId,actorId:actor.id,type,reference:input.reference,
        warehouseId:input.warehouseId,supplierId:supplier?.id??null,counterparty:supplier?.name??input.counterparty!,
        idempotencyKey:key,requestHash,total}});
      for(const line of lines){
        const batch=await tx.inventoryBatch.findFirst({where:{id:line.batchId,companyId:actor.companyId}});
        if(!batch)throw new NotFoundException("Lote no encontrado");
        if(supplier&&batch.supplierId&&batch.supplierId!==supplier.id)throw new ConflictException("El lote pertenece a otro proveedor");
        const movement=await this.movements.createInTransaction(tx,actor,{batchId:line.batchId,type:type==="PURCHASE"?"IN":"OUT",quantity:line.quantity,
          ...(type==="PURCHASE"?{destinationWarehouseId:input.warehouseId}:{sourceWarehouseId:input.warehouseId}),
          reason:(type==="PURCHASE"?"Compra ":"Venta ")+input.reference},randomUUID());
        await tx.tradeLine.create({data:{companyId:actor.companyId,documentId:doc.id,batchId:line.batchId,movementId:movement.id,
          quantity:line.quantity,unitPrice:line.unitPrice,total:new Prisma.Decimal(line.unitPrice).mul(line.quantity)}});
      }
      await audit(tx,actor,type==="PURCHASE"?"purchases.create":"sales.create",doc.id,{reference:input.reference,total:total.toFixed(2)});
      return tx.tradeDocument.findUniqueOrThrow({where:{id:doc.id},include});
    });}catch(error){
      if(error instanceof Prisma.PrismaClientKnownRequestError&&error.code==="P2002"){
        const prior=await this.db.client.tradeDocument.findUnique({where:{companyId_idempotencyKey:{companyId:actor.companyId,idempotencyKey:key}},include});
        if(prior){match(prior);return prior;}
      }
      throw error;
    }
  }
}
