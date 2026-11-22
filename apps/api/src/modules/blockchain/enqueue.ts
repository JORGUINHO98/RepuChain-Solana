import { Prisma } from "@repuchain/database";
import { canonicalJson,sha256,type Json } from "@repuchain/blockchain-client";
type Tx=Prisma.TransactionClient;
async function enqueue(tx:Tx,companyId:string,batchId:string,eventId:string,sequence:number,payload:Json){
  const canonicalPayload=canonicalJson(payload);
  await tx.evidenceOutbox.create({data:{companyId,batchId,eventId,sequence,canonicalPayload,payloadHash:sha256(canonicalPayload)}});
}
export async function enqueueMovement(tx:Tx,m:{id:string;companyId:string;batchId:string;actorId:string;type:string;quantity:number;sourceWarehouseId:string|null;destinationWarehouseId:string|null;reason:string;createdAt:Date}){
  const batch=await tx.inventoryBatch.update({where:{id:m.batchId},data:{evidenceSequence:{increment:1}}});
  await enqueue(tx,m.companyId,m.batchId,m.id,batch.evidenceSequence,{
    domain:"REPUCHAIN_INVENTORY_MOVEMENT",version:1,companyId:m.companyId,batchId:m.batchId,eventId:m.id,
    actorId:m.actorId,type:m.type,quantity:m.quantity,sourceWarehouseId:m.sourceWarehouseId,
    destinationWarehouseId:m.destinationWarehouseId,reason:m.reason,createdAt:m.createdAt.toISOString(),
  });
}
/** Caller holds the batch row lock (or just created the batch). Legacy rows are snapshotted once. */
export async function ensureBatchEvidence(tx:Tx,b:{id:string;companyId:string;productId:string;supplierId:string|null;code:string;receivedAt:Date;createdAt:Date}){
  if(await tx.evidenceOutbox.findUnique({where:{batchId_sequence:{batchId:b.id,sequence:0}}}))return;
  await enqueue(tx,b.companyId,b.id,b.id,0,{
    domain:"REPUCHAIN_BATCH_RECEIPT",version:1,companyId:b.companyId,batchId:b.id,
    productId:b.productId,supplierId:b.supplierId,code:b.code,receivedAt:b.receivedAt.toISOString(),createdAt:b.createdAt.toISOString(),
  });
  const historical=await tx.inventoryMovement.findMany({where:{companyId:b.companyId,batchId:b.id},orderBy:[{createdAt:"asc"},{id:"asc"}]});
  for(const movement of historical)await enqueueMovement(tx,movement);
}
