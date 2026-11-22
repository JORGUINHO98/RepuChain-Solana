import {spawn,spawnSync} from "node:child_process";
import {mkdtemp,readFile,writeFile,chmod} from "node:fs/promises";
import {createServer} from "node:net";
import {once} from "node:events";
import {createHash} from "node:crypto";
import {setTimeout as delay} from "node:timers/promises";

async function freePort(){
  const server=createServer();server.listen(0,"127.0.0.1");await once(server,"listening");
  const port=server.address().port;await new Promise(resolve=>server.close(resolve));return port;
}
function run(args){
  const result=spawnSync("solana",args,{encoding:"utf8",maxBuffer:4*1024*1024});
  if(result.status!==0)throw new Error("Solana CLI falló: "+(result.stderr??"").split("\n").slice(0,2).join(" "));
  return result.stdout.trim();
}
const receipt=JSON.parse(await readFile("target/blockchain-test-receipt.json","utf8"));
const binary=await readFile("target/deploy/repu_chain.so");
const hash=createHash("sha256").update(binary).digest("hex");
if(!receipt.passed||receipt.binarySha256!==hash)throw new Error("Primero ejecuta blockchain:test");
const directory=await mkdtemp("target/localnet-");
const port=await freePort(),faucet=await freePort(),url="http://127.0.0.1:"+port;
const payer=directory+"/payer.json",buffer=directory+"/buffer.json";
for(const key of [payer,buffer]){
  const result=spawnSync("solana-keygen",["new","--silent","--no-bip39-passphrase","--outfile",key],{encoding:"utf8"});
  if(result.status!==0)throw new Error("No se pudo generar la clave local");
  await chmod(key,0o600);
}
const validator=spawn("solana-test-validator",["--ledger",directory+"/ledger","--bind-address","127.0.0.1","--rpc-port",String(port),"--faucet-port",String(faucet),"--quiet"],{stdio:["ignore","pipe","pipe"]});
let logs="";validator.stdout.on("data",data=>logs+=data);validator.stderr.on("data",data=>logs+=data);
async function rpc(method,params=[]){
  const response=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({jsonrpc:"2.0",id:1,method,params}),signal:AbortSignal.timeout(3000)});
  const data=await response.json();if(data.error)throw new Error(data.error.message);return data.result;
}
try{
  let ready=false;
  for(let attempt=0;attempt<120;attempt++){
    if(validator.exitCode!==null)throw new Error("Validador terminó: "+logs.slice(-1500));
    try{if(await rpc("getHealth")==="ok"){ready=true;break;}}catch{}
    await delay(500);
  }
  if(!ready)throw new Error("Validador local no disponible");
  console.log("Validador local disponible. Desplegando el binario probado…");
  run(["airdrop","10","--url",url,"--keypair",payer,"--commitment","confirmed"]);
  const result=JSON.parse(run(["program","deploy","target/deploy/repu_chain.so","--program-id","blockchain/.keys/program.json","--buffer",buffer,"--keypair",payer,"--upgrade-authority",payer,"--url",url,"--commitment","confirmed","--use-rpc","--max-sign-attempts","2","--max-len",String(binary.length),"--output","json"]));
  const signature=result.signature??result.transactionSignature;
  if(typeof signature!=="string")throw new Error("Firma no encontrada; campos de respuesta: "+Object.keys(result).join(","));
  let status=null;
  for(let attempt=0;attempt<30;attempt++){
    status=(await rpc("getSignatureStatuses",[[signature],{searchTransactionHistory:true}])).value[0];
    if(status?.err)throw new Error("Transacción local fallida");
    if(status&&["confirmed","finalized"].includes(status.confirmationStatus))break;
    await delay(500);
  }
  if(!status||!["confirmed","finalized"].includes(status.confirmationStatus))throw new Error("Falta confirmación local");
  const account=(await rpc("getAccountInfo",[receipt.programId,{commitment:"confirmed",encoding:"base64"}])).value;
  if(!account?.executable)throw new Error("El programa local no es ejecutable");
  run(["program","dump",receipt.programId,directory+"/verified.so","--url",url,"--keypair",payer,"--commitment","confirmed"]);
  const downloaded=await readFile(directory+"/verified.so");
  if(!downloaded.subarray(0,binary.length).equals(binary)||downloaded.subarray(binary.length).some(v=>v!==0))throw new Error("El binario local descargado no coincide");
  await writeFile("target/localnet-deployment-receipt.json",JSON.stringify({network:"localnet",programId:receipt.programId,signature,confirmation:status.confirmationStatus,binarySha256:hash,verifiedAt:new Date().toISOString(),ledgerDirectory:directory},null,2));
  console.log("Despliegue local confirmado; binario descargado idéntico al probado. No es un despliegue Devnet.");
}finally{
  if(validator.exitCode===null){
    validator.kill("SIGTERM");await Promise.race([once(validator,"exit"),delay(5000)]);
    if(validator.exitCode===null)validator.kill("SIGKILL");
  }
}
