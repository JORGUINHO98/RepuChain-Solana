import {beforeAll,afterAll,it,expect} from "vitest";
import {spawn,spawnSync,type ChildProcess} from "node:child_process";
import {mkdtemp,readFile} from "node:fs/promises";
import {createServer} from "node:net";
import {once} from "node:events";
import {setTimeout as delay} from "node:timers/promises";
import {randomUUID} from "node:crypto";
import {RepuChainClient,PROGRAM_ID,EvidenceConflict} from "../../packages/blockchain-client/dist";
import {OutboxProcessor} from "../../apps/api/src/modules/blockchain/processor";
import {setup,teardown,request,db,companyId} from "../e2e/helpers";
let validator:ChildProcess,client:RepuChainClient,processor:OutboxProcessor,batchId:string,warehouseId:string;
async function port(){
  const server=createServer();server.listen(0,"127.0.0.1");await once(server,"listening");
  const value=(server.address() as {port:number}).port;await new Promise<void>(resolve=>server.close(()=>resolve()));return value;
}
beforeAll(async()=>{
  const directory=await mkdtemp("target/phase4-localnet-"),rpcPort=await port(),faucetPort=await port(),endpoint="http://127.0.0.1:"+rpcPort;
  const key=directory+"/payer.json";
  const generated=spawnSync("solana-keygen",["new","--silent","--no-bip39-passphrase","--outfile",key],{encoding:"utf8"});
  if(generated.status!==0)throw new Error("Could not create test signer");
  validator=spawn("solana-test-validator",["--ledger",directory+"/ledger","--bind-address","127.0.0.1","--rpc-port",String(rpcPort),"--faucet-port",String(faucetPort),"--bpf-program",PROGRAM_ID,"target/deploy/repu_chain.so","--quiet"],{stdio:["ignore","pipe","pipe"]});
  let logs="";validator.stdout?.on("data",v=>logs+=v);validator.stderr?.on("data",v=>logs+=v);
  for(let i=0;i<100;i++){
    if(validator.exitCode!==null)throw new Error(logs.slice(-1500));
    try{
      client=await RepuChainClient.create(endpoint,Uint8Array.from(JSON.parse(await readFile(key,"utf8"))),true);break;
    }catch{await delay(500);}
  }
  if(!client)throw new Error("Local validator unavailable");
  const signature=await client.rpc<string>("requestAirdrop",[client.authority,10000000000]);
  for(let i=0;i<40;i++){const status=await client.signatureStatus(signature);if(status&&["confirmed","finalized"].includes(status.confirmationStatus??""))break;await delay(250);}
  await setup();processor=new OutboxProcessor(db,client,companyId);
});
afterAll(async()=>{
  await teardown();
  if(validator?.exitCode===null){validator.kill("SIGTERM");await Promise.race([once(validator,"exit"),delay(5000)]);if(validator.exitCode===null)validator.kill("SIGKILL");}
});
async function drain(){
  for(let i=0;i<35;i++){
    await db.evidenceOutbox.updateMany({where:{companyId,status:"PENDING"},data:{availableAt:new Date(0)}});
    await processor.processOne();
    const rows=await db.evidenceOutbox.findMany({where:{companyId}});
    const failed=rows.find(r=>r.status==="FAILED");
    if(failed)throw new Error("Evidence failed: "+failed.lastError);
    if(rows.every(r=>r.status==="CONFIRMED"))return rows;
    await delay(1500);
  }
  throw new Error("Confirmation timeout");
}
it("conecta API, PostgreSQL y programa SBF con firmas reales",async()=>{
  const p=await request("POST","/products",{sku:"SBF",name:"Repuesto prueba local"});
  const w=await request("POST","/warehouses",{code:"SBF",name:"Almacén"});warehouseId=w.body.id;
  const b=await request("POST","/batches",{code:"SBF",productId:p.body.id});expect(b.status).toBe(201);batchId=b.body.id;
  expect((await request("POST","/movements",{batchId,type:"IN",quantity:10,destinationWarehouseId:warehouseId,reason:"Entrada local"},undefined,randomUUID())).status).toBe(201);
  const receipt=await db.evidenceOutbox.findUniqueOrThrow({where:{batchId_sequence:{batchId,sequence:0}}});
  await client.prepare({companyId,batchId,eventId:batchId,sequence:0,payloadHash:receipt.payloadHash,previousHash:null,previousEventId:null});
  const rows=await drain();expect(rows).toHaveLength(2);
  for(const row of rows){expect(row.signature).toBeTruthy();expect((await client.signatureStatus(row.signature!))?.err).toBeNull();}
  const api=await request("GET","/blockchain/evidence?batchId="+batchId);
  expect(api.body.items.every((v:any)=>v.status==="CONFIRMED")).toBe(true);
});
it("recupera envío aceptado aunque se pierda la respuesta del RPC",async()=>{
  const m=await request("POST","/movements",{batchId,type:"OUT",quantity:1,sourceWarehouseId:warehouseId,reason:"Salida con corte"},undefined,randomUUID());
  const interrupted=Object.create(client) as RepuChainClient;
  interrupted.send=async tx=>{await client.send(tx);throw new Error("Simulated connection lost after submission");};
  await new OutboxProcessor(db,interrupted,companyId).processOne();
  const pending=await db.evidenceOutbox.findUniqueOrThrow({where:{companyId_eventId:{companyId,eventId:m.body.id}},include:{transactions:true}});
  expect(pending.status).toBe("PENDING");expect(pending.transactions).toHaveLength(1);
  await drain();
  const recovered=await db.evidenceOutbox.findUniqueOrThrow({where:{id:pending.id},include:{transactions:true}});
  expect(recovered.status).toBe("CONFIRMED");expect(recovered.transactions).toHaveLength(1);
  expect(recovered.signature).toBe(pending.transactions[0]!.signature);
});
it("detecta payload alterado al contrastarlo con la cuenta on-chain",async()=>{
  const receipt=await db.evidenceOutbox.findUniqueOrThrow({where:{batchId_sequence:{batchId,sequence:0}}});
  await expect(client.verify({companyId,batchId,eventId:batchId,sequence:0,payloadHash:"ff".repeat(32),previousHash:null,previousEventId:null})).rejects.toBeInstanceOf(EvidenceConflict);
  expect(receipt.status).toBe("CONFIRMED");
});
