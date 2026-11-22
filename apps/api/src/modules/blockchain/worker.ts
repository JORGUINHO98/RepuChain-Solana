import { readFile,stat } from "node:fs/promises";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { config } from "dotenv";
import { createDatabase } from "@repuchain/database";
import { RepuChainClient,uuidBytes } from "@repuchain/blockchain-client";
import { OutboxProcessor } from "./processor";
config({path:resolve(process.cwd(),"database/.env")});
async function main(){
  const company=process.env.BLOCKCHAIN_COMPANY_ID??"";
  uuidBytes(company);
  const keyPath=process.env.BLOCKCHAIN_SIGNER_PATH;
  if(!keyPath)throw new Error("BLOCKCHAIN_SIGNER_PATH is required for the worker");
  const meta=await stat(keyPath);
  if(process.platform!=="win32"&&(meta.mode&0o077)!==0)throw new Error("Signer file must have mode 600");
  const key:unknown=JSON.parse(await readFile(keyPath,"utf8"));
  if(!Array.isArray(key)||key.length!==64||!key.every(v=>Number.isInteger(v)&&v>=0&&v<=255))throw new Error("Invalid signer file");
  if(![undefined,"devnet","localnet"].includes(process.env.BLOCKCHAIN_NETWORK))throw new Error("Unknown blockchain network");
  const local=process.env.BLOCKCHAIN_NETWORK==="localnet";
  if(local&&process.env.NODE_ENV!=="test")throw new Error("Localnet is restricted to explicit test runs");
  const client=await RepuChainClient.create(process.env.BLOCKCHAIN_RPC_URL??"https://api.devnet.solana.com",Uint8Array.from(key),local);
  const db=createDatabase(process.env.DATABASE_URL!);
  const processor=new OutboxProcessor(db,client,company);
  let stopped=false;
  process.once("SIGINT",()=>{stopped=true;});process.once("SIGTERM",()=>{stopped=true;});
  try{
    await processor.bind();
    console.log("Worker ready:",local?"localnet":"devnet","company",company,"authority",client.authority);
    do{
      await processor.processOne();
      if(process.argv.includes("--once"))break;
      if(!stopped)await delay(5000);
    }while(!stopped);
  }finally{await db.$disconnect();}
}
main().catch(()=>{console.error("Blockchain worker stopped. Check configuration, database, RPC and signer permissions.");process.exitCode=1;});
