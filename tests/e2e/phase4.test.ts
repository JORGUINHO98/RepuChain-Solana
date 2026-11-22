import {beforeAll,afterAll,describe,it,expect} from "vitest";
import {randomUUID} from "node:crypto";
import {setup,teardown,request,db,companyId,otherToken,login,password} from "./helpers";
import {OutboxProcessor,type EvidenceGateway} from "../../apps/api/src/modules/blockchain/processor";
import {sha256} from "../../packages/blockchain-client/src";
beforeAll(setup);afterAll(teardown);
let batchId:string,warehouseId:string,movementId:string,receiptId:string;
const gateway:EvidenceGateway={
  authority:"8FreXnhKCs7VeTtWz8BhqDsEzREASeWDFj1zZLV7ZCqv",local:true,
  verify:async()=>null,signatureStatus:async()=>null,blockHeight:async()=>1n,
  prepare:async()=>({signature:randomUUID(),wire:"test-signed-transaction",lastValidBlockHeight:100n}),
  send:async()=>{throw new Error("Simulated network failure");},
};
describe("Fase 4 · API y Outbox en PostgreSQL",()=>{
  it("crea lote y recepción pendiente en una sola operación",async()=>{
    const p=await request("POST","/products",{sku:"CHAIN",name:"Repuesto"});
    const w=await request("POST","/warehouses",{code:"CHAIN",name:"Almacén"});warehouseId=w.body.id;
    const b=await request("POST","/batches",{productId:p.body.id,code:"CHAIN"});expect(b.status).toBe(201);batchId=b.body.id;
    const evidence=await db.evidenceOutbox.findMany({where:{batchId}});
    expect(evidence).toHaveLength(1);expect(evidence[0]!.sequence).toBe(0);expect(evidence[0]!.status).toBe("PENDING");
    expect(sha256(evidence[0]!.canonicalPayload)).toBe(evidence[0]!.payloadHash);receiptId=evidence[0]!.id;
  });
  it("encola una sola evidencia por movimiento idempotente y revierte errores",async()=>{
    const key=randomUUID(),body={batchId,type:"IN",quantity:5,destinationWarehouseId:warehouseId,reason:"Entrada"};
    const a=await request("POST","/movements",body,undefined,key);expect(a.status).toBe(201);movementId=a.body.id;
    const b=await request("POST","/movements",body,undefined,key);expect(b.body.id).toBe(movementId);
    expect(await db.evidenceOutbox.count({where:{batchId}})).toBe(2);
    const failed=await request("POST","/movements",{batchId,type:"OUT",quantity:6,sourceWarehouseId:warehouseId,reason:"Sin stock"},undefined,randomUUID());
    expect(failed.status).toBe(409);expect(await db.evidenceOutbox.count({where:{batchId}})).toBe(2);
  });
  it("aísla consultas por empresa y no expone bytes de transacciones",async()=>{
    expect((await request("GET","/blockchain/evidence/"+receiptId,undefined,otherToken)).status).toBe(404);
    const result=await request("GET","/blockchain/evidence?batchId="+batchId);
    expect(result.status).toBe(200);expect(result.body.total).toBe(2);
    expect(result.body.items[0].wire).toBeUndefined();expect(result.body.items[0].transactions).toBeUndefined();
  });
  it("conserva la firma antes del envío fallido y bloquea sucesores",async()=>{
    const worker=new OutboxProcessor(db,gateway,companyId);
    expect(await worker.processOne()).toBe(true);
    const row=await db.evidenceOutbox.findUniqueOrThrow({where:{id:receiptId},include:{transactions:true}});
    expect(row.status).toBe("PENDING");expect(row.attempts).toBe(1);expect(row.transactions).toHaveLength(1);
    expect(row.lastError).toBe("RPC_OR_CONFIRMATION");expect(await worker.processOne()).toBe(false);
    expect((await db.evidenceOutbox.findUniqueOrThrow({where:{companyId_eventId:{companyId,eventId:movementId}}})).attempts).toBe(0);
  });
  it("reutiliza los mismos bytes firmados mientras el blockhash es válido",async()=>{
    await db.evidenceOutbox.update({where:{id:receiptId},data:{availableAt:new Date(0)}});
    await new OutboxProcessor(db,gateway,companyId).processOne();
    expect(await db.evidenceTransaction.count({where:{outboxId:receiptId}})).toBe(1);
  });
  it("dos workers no reclaman simultáneamente la misma evidencia",async()=>{
    await db.evidenceOutbox.update({where:{id:receiptId},data:{availableAt:new Date(0)}});
    const results=await Promise.all([new OutboxProcessor(db,gateway,companyId).processOne(),new OutboxProcessor(db,gateway,companyId).processOne()]);
    expect(results.filter(Boolean)).toHaveLength(1);
    expect(await db.evidenceTransaction.count({where:{outboxId:receiptId}})).toBe(1);
  });
  it("recupera leases vencidos y pasa a FAILED tras diez intentos",async()=>{
    await db.evidenceOutbox.update({where:{id:receiptId},data:{status:"PROCESSING",leaseToken:randomUUID(),lockedUntil:new Date(0),attempts:9}});
    await new OutboxProcessor(db,gateway,companyId).processOne();
    expect((await db.evidenceOutbox.findUniqueOrThrow({where:{id:receiptId}})).status).toBe("FAILED");
  });
  it("solo administración puede reintentar y queda auditado",async()=>{
    const role=await db.role.findFirstOrThrow({where:{companyId,name:"VIEWER"}});
    await request("POST","/users",{name:"Lector",email:"chainviewer@test.local",password,roleId:role.id});
    const viewer=(await login("chainviewer@test.local")).accessToken;
    expect((await request("POST","/blockchain/evidence/"+receiptId+"/retry",{},viewer)).status).toBe(403);
    expect((await request("POST","/blockchain/evidence/"+receiptId+"/retry",{},otherToken)).status).toBe(404);
    expect((await request("POST","/blockchain/evidence/"+receiptId+"/retry",{})).status).toBe(201);
    expect(await db.auditLog.count({where:{companyId,action:"blockchain.retry",entityId:receiptId}})).toBe(1);
  });
  it("recupera una confirmación previa sin reenviar ni duplicar",async()=>{
    const recovered:EvidenceGateway={...gateway,signatureStatus:async()=>({err:null,confirmationStatus:"confirmed"}),
      verify:async()=>({account:"account-test",companyAccount:"company-test",evidenceHash:"aa".repeat(32)}),
      send:async()=>{throw new Error("Must not send");}};
    await new OutboxProcessor(db,recovered,companyId).processOne();
    const row=await db.evidenceOutbox.findUniqueOrThrow({where:{id:receiptId}});
    expect(row.status).toBe("CONFIRMED");expect(row.signature).toBeTruthy();
    expect(await db.evidenceTransaction.count({where:{outboxId:receiptId}})).toBe(1);
  });
  it("protege payloads, confirmaciones y vinculaciones contra alteración",async()=>{
    await expect(db.evidenceOutbox.update({where:{id:receiptId},data:{canonicalPayload:"{}"}})).rejects.toThrow();
    await expect(db.evidenceOutbox.update({where:{id:receiptId},data:{status:"PENDING"}})).rejects.toThrow();
    await expect(new OutboxProcessor(db,{...gateway,authority:"DvPk4NiE9vPZmR1TxE4C5X23stk7n2oTtcrVMW6Rqjq2"},companyId).processOne()).rejects.toThrow();
  });

  it("renueva una transacción vencida y nunca confirma una firma fallida",async()=>{
    const row=await db.evidenceOutbox.findUniqueOrThrow({where:{companyId_eventId:{companyId,eventId:movementId}}});
    await new OutboxProcessor(db,gateway,companyId).processOne();
    expect(await db.evidenceTransaction.count({where:{outboxId:row.id}})).toBe(1);
    await db.evidenceOutbox.update({where:{id:row.id},data:{availableAt:new Date(0)}});
    const expired:EvidenceGateway={...gateway,blockHeight:async()=>200n,
      signatureStatus:async()=>({err:{InstructionError:[0,"Custom"]},confirmationStatus:"confirmed"}),
      prepare:async()=>({signature:randomUUID(),wire:"new-signed-transaction",lastValidBlockHeight:300n})};
    await new OutboxProcessor(db,expired,companyId).processOne();
    const after=await db.evidenceOutbox.findUniqueOrThrow({where:{id:row.id}});
    expect(after.status).toBe("PENDING");expect(after.signature).toBeNull();
    expect(await db.evidenceTransaction.count({where:{outboxId:row.id}})).toBe(2);
  });
  it("incorpora el historial previo antes del primer movimiento nuevo",async()=>{
    const admin=await db.user.findFirstOrThrow({where:{companyId,email:"admin@test.local"}});
    const product=await db.product.findFirstOrThrow({where:{companyId}});
    const legacy=await db.inventoryBatch.create({data:{companyId,productId:product.id,code:"LEGACY"}});
    const old=await db.inventoryMovement.create({data:{companyId,batchId:legacy.id,actorId:admin.id,type:"IN",quantity:5,destinationWarehouseId:warehouseId,reason:"Historial previo",idempotencyKey:randomUUID(),requestHash:"ab".repeat(32)}});
    await db.stock.create({data:{companyId,batchId:legacy.id,warehouseId,quantity:5}});
    const result=await request("POST","/movements",{batchId:legacy.id,type:"IN",quantity:2,destinationWarehouseId:warehouseId,reason:"Entrada nueva"},undefined,randomUUID());
    expect(result.status).toBe(201);
    const rows=await db.evidenceOutbox.findMany({where:{batchId:legacy.id},orderBy:{sequence:"asc"}});
    expect(rows.map(r=>r.eventId)).toEqual([legacy.id,old.id,result.body.id]);
    expect(rows.map(r=>r.sequence)).toEqual([0,1,2]);
    expect((await db.stock.findUniqueOrThrow({where:{companyId_batchId_warehouseId:{companyId,batchId:legacy.id,warehouseId}}})).quantity).toBe(7);
  });

});
