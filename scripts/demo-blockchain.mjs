import {readFile,writeFile,mkdir} from "node:fs/promises";
import {spawn} from "node:child_process";
import {createServer} from "node:net";
import {once} from "node:events";
import {randomBytes,randomUUID} from "node:crypto";
import {setTimeout as delay} from "node:timers/promises";
import {createDatabase} from "../database/dist/index.js";
import {provisionCompany} from "../database/dist/bootstrap.js";
import {RepuChainClient,PROGRAM_ID} from "../packages/blockchain-client/dist/index.js";
import {OutboxProcessor} from "../apps/api/dist/modules/blockchain/processor.js";
process.loadEnvFile("database/.env");
const db=createDatabase(process.env.DATABASE_URL);
let api;
try{
  const client=await RepuChainClient.create("https://api.devnet.solana.com",
    Uint8Array.from(JSON.parse(await readFile("blockchain/.keys/deployer.json","utf8"))));
  await mkdir("target",{recursive:true});
  const contextPath="target/phase4-devnet-demo-context.json";
  let context;
  try{context=JSON.parse(await readFile(contextPath,"utf8"));}catch(error){if(error.code!=="ENOENT")throw error;}
  if(!context){
    const slug="blockchain-demo-"+randomUUID(),password=randomBytes(32).toString("hex");
    const result=await provisionCompany(db,{slug,name:"Demostración sintética Fase 4",adminEmail:"demo@repuchain.local",adminPassword:password});
    const server=createServer();server.listen(0,"127.0.0.1");await once(server,"listening");
    const port=server.address().port;await new Promise(resolve=>server.close(resolve));
    const base="http://127.0.0.1:"+port+"/api/v1";
    api=spawn(process.execPath,["dist/main.js"],{cwd:"apps/api",env:{...process.env,PORT:String(port),HOST:"127.0.0.1",JWT_SECRET:randomBytes(48).toString("hex")},stdio:"ignore"});
    let ready=false;
    for(let i=0;i<80;i++){
      if(api.exitCode!==null)throw new Error("Demo API did not start");
      try{if((await fetch(base+"/health")).ok){ready=true;break;}}catch{}
      await delay(150);
    }
    if(!ready)throw new Error("Demo API timeout");
    let token="";
    async function post(path,body,key){
      const response=await fetch(base+path,{method:"POST",headers:{"Content-Type":"application/json",...(token?{Authorization:"Bearer "+token}:{}),...(key?{"Idempotency-Key":key}:{})},body:JSON.stringify(body)});
      if(!response.ok)throw new Error("Demo API "+path+" returned "+response.status);
      return response.json();
    }
    token=(await post("/auth/login",{companySlug:slug,email:"demo@repuchain.local",password})).accessToken;
    try{
      const product=await post("/products",{sku:"DEMO-P4",name:"Repuesto sintético de prueba"});
      const warehouse=await post("/warehouses",{code:"DEMO-P4",name:"Almacén de demostración"});
      const batch=await post("/batches",{code:"DEMO-P4",productId:product.id});
      const movement=await post("/movements",{batchId:batch.id,type:"IN",quantity:1,destinationWarehouseId:warehouse.id,reason:"Demostración sintética de integración Devnet"},randomUUID());
      context={companyId:result.company.id,batchId:batch.id,movementId:movement.id};
      await writeFile(contextPath,JSON.stringify(context,null,2));
    }finally{await post("/auth/logout",{});}
  }
  const processor=new OutboxProcessor(db,client,context.companyId);
  console.log("Processing synthetic Devnet evidence for company",context.companyId);
  let confirmed=false;
  for(let i=0;i<60;i++){
    await processor.processOne();
    const rows=await db.evidenceOutbox.findMany({where:{companyId:context.companyId,batchId:context.batchId},orderBy:{sequence:"asc"}});
    if(rows.some(r=>r.status==="FAILED"))throw new Error("Evidence requires review; inspect the persisted outbox");
    if(rows.length===2&&rows.every(r=>r.status==="CONFIRMED")){
      await mkdir("blockchain/deployments",{recursive:true});
      await writeFile("blockchain/deployments/phase-4-demo.json",JSON.stringify({
        network:"devnet",synthetic:true,programId:PROGRAM_ID,authority:client.authority,...context,
        verifiedAt:new Date().toISOString(),evidence:rows.map(r=>({
          id:r.id,sequence:r.sequence,payloadHash:r.payloadHash,evidenceHash:r.evidenceHash,
          account:r.account,signature:r.signature,status:r.status,
        })),
      },null,2));
      confirmed=true;break;
    }
    await delay(5000);
  }
  if(!confirmed)throw new Error("Confirmation pending; rerun this command to resume the same outbox");
  console.log("Devnet evidence verified: blockchain/deployments/phase-4-demo.json");
}finally{
  if(api?.exitCode===null){api.kill("SIGTERM");await Promise.race([once(api,"exit"),delay(3000)]);if(api.exitCode===null)api.kill("SIGKILL");}
  await db.$disconnect();
}
