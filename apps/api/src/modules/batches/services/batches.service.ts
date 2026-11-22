import QRCode from "qrcode";
import {batchQr} from "@repuchain/utils";
import { ensureBatchEvidence } from "../../blockchain/enqueue";
import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { DatabaseService } from "../../../database/database.service";
import type { AuthenticatedUser } from "@repuchain/shared-types";
import type { BatchInput, ListQuery } from "@repuchain/validation";
import { audit } from "../../audit/services/audit";
@Injectable()
export class BatchesService {
  constructor(@Inject(DatabaseService) private readonly db: DatabaseService) {}
  async list(actor: AuthenticatedUser, query: ListQuery) {
    const where = { companyId: actor.companyId, ...(query.search ? { code: { contains: query.search, mode: "insensitive" as const } } : {}) };
    const [items,total] = await this.db.client.$transaction([this.db.client.inventoryBatch.findMany({ where, include: { product: true, supplier: true }, orderBy: { createdAt: "desc" }, skip:(query.page-1)*query.limit,take:query.limit }),this.db.client.inventoryBatch.count({where})]);
    return {items,total,page:query.page,limit:query.limit};
  }
  async qr(actor:AuthenticatedUser,id:string){const batch=await this.get(actor,id);return {payload:batch.qrPayload,svg:await QRCode.toString(batch.qrPayload,{type:"svg",errorCorrectionLevel:"M",margin:4,width:320})};}
  async get(actor:AuthenticatedUser,id:string){
    const batch=await this.db.client.inventoryBatch.findFirst({where:{id,companyId:actor.companyId},include:{product:true,supplier:true,stock:{include:{warehouse:true}}}});
    if(!batch)throw new NotFoundException("Lote no encontrado");
    return {...batch,qrPayload:batchQr(actor.companyId,batch.id)};
  }
  async create(actor: AuthenticatedUser, input: BatchInput) {
    return this.db.client.$transaction(async tx => {
      if (!await tx.product.findFirst({ where: { id: input.productId, companyId: actor.companyId, active:true } })) throw new NotFoundException("Producto activo no encontrado");
      if (input.supplierId && !await tx.supplier.findFirst({where:{id:input.supplierId,companyId:actor.companyId,active:true}})) throw new NotFoundException("Proveedor activo no encontrado");
      const batch = await tx.inventoryBatch.create({data:{...input,companyId:actor.companyId}});
      await ensureBatchEvidence(tx,batch);
      await audit(tx,actor,"batches.create",batch.id);
      return batch;
    });
  }
}
