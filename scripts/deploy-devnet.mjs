import {spawnSync} from "node:child_process";
import {readFile,writeFile,mkdir,access,chmod} from "node:fs/promises";
import {createHash} from "node:crypto";
import {setTimeout as delay} from "node:timers/promises";
const endpoint="https://api.devnet.solana.com";
const genesis="EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG";
const programId="3hgkgx5V7UgU1Dac8R6ZCx2ZYs1PeHPUphFgRmG52GWv";
const programKey="blockchain/.keys/program.json",payerKey="blockchain/.keys/deployer.json",bufferKey="blockchain/.keys/buffer.json";
const binaryPath="target/deploy/repu_chain.so";
function command(name,args){
  const result=spawnSync(name,args,{encoding:"utf8",maxBuffer:4*1024*1024});
  if(result.status!==0)throw new Error(name+" falló. No se registra un despliegue confirmado. "+(result.stderr??"").slice(-2000));
  return result.stdout.trim();
}
async function rpc(method,params=[]){
  const response=await fetch(endpoint,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({jsonrpc:"2.0",id:1,method,params}),signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw new Error("RPC HTTP "+response.status);
  const body=await response.json();if(body.error)throw new Error("Error RPC: "+body.error.message);
  return body.result;
}
if(await rpc("getGenesisHash")!==genesis)throw new Error("La red no es Solana Devnet");
const binary=await readFile(binaryPath),hash=createHash("sha256").update(binary).digest("hex");
const receipt=JSON.parse(await readFile("target/blockchain-test-receipt.json","utf8"));
if(!receipt.passed||receipt.binarySha256!==hash||receipt.programId!==programId)throw new Error("Ejecuta pnpm blockchain:test sobre este binario antes de desplegar");
if(command("solana-keygen",["pubkey",programKey])!==programId)throw new Error("La clave del programa no coincide con la dirección esperada");
const payer=command("solana-keygen",["pubkey",payerKey]);
const balance=(await rpc("getBalance",[payer,{commitment:"confirmed"}])).value;
const rent=await rpc("getMinimumBalanceForRentExemption",[binary.length+45]);
if(balance<rent*2+10000000)throw new Error("Saldo Devnet insuficiente. Se requieren aproximadamente "+((rent*2+10000000)/1e9).toFixed(3)+" SOL de prueba; saldo "+balance/1e9);
await mkdir("blockchain/.keys",{recursive:true});
try{await access(bufferKey);}catch{command("solana-keygen",["new","--silent","--no-bip39-passphrase","--outfile",bufferKey]);}
await chmod(bufferKey,0o600);
const result=JSON.parse(command("solana",["program","deploy",binaryPath,"--url",endpoint,"--keypair",payerKey,"--upgrade-authority",payerKey,
  "--program-id",programKey,"--buffer",bufferKey,"--max-len",String(binary.length),"--use-tpu-client","--max-sign-attempts","3","--commitment","confirmed","--output","json"]));
const signature=result.signature??result.transactionSignature;
if(typeof signature!=="string")throw new Error("No se obtuvo la firma de despliegue; requiere verificación manual");
let confirmed=false;
for(let attempt=0;attempt<40;attempt++){
  const status=(await rpc("getSignatureStatuses",[[signature],{searchTransactionHistory:true}])).value[0];
  if(status?.err)throw new Error("La transacción de despliegue falló");
  if(status&&["confirmed","finalized"].includes(status.confirmationStatus)){confirmed=true;break;}
  await delay(1500);
}
if(!confirmed)throw new Error("No se pudo verificar la confirmación del despliegue");
const account=(await rpc("getAccountInfo",[programId,{encoding:"base64",commitment:"confirmed"}])).value;
if(!account?.executable)throw new Error("El programa no es ejecutable en Devnet");
command("solana",["program","dump",programId,"target/devnet-verified.so","--url",endpoint,"--keypair",payerKey,"--commitment","confirmed"]);
const deployed=await readFile("target/devnet-verified.so");
if(!deployed.subarray(0,binary.length).equals(binary)||deployed.subarray(binary.length).some(v=>v!==0))throw new Error("El binario desplegado difiere del probado");
await mkdir("blockchain/deployments",{recursive:true});
await writeFile("blockchain/deployments/devnet.json",JSON.stringify({
  network:"devnet",programId,upgradeAuthority:payer,signature,confirmation:"confirmed",
  binarySha256:hash,binaryBytes:binary.length,verifiedAt:new Date().toISOString(),
  explorer:"https://explorer.solana.com/address/"+programId+"?cluster=devnet",
},null,2));
console.log("Despliegue confirmado y binario verificado. Registro: blockchain/deployments/devnet.json");
