import {config} from "dotenv";
import {createDatabase} from "@repuchain/database";
import {uuidBytes} from "@repuchain/blockchain-client";
import {ensureBatchEvidence} from "./enqueue";
config({path:"database/.env"});
async function main(){
  const companyId=process.env.BLOCKCHAIN_COMPANY_ID??"";
  uuidBytes(companyId);
  const db=createDatabase(process.env.DATABASE_URL!);
  try{
    let cursor:string|undefined,count=0;
    while(true){
      const batch=await db.inventoryBatch.findFirst({where:{companyId,...(cursor?{id:{gt:cursor}}:{})},orderBy:{id:"asc"}});
      if(!batch)break;
      await db.$transaction(async tx=>{
        await tx.$queryRaw`SELECT id FROM inventory_batches WHERE id=${batch.id}::uuid AND "companyId"=${companyId}::uuid FOR UPDATE`;
        await ensureBatchEvidence(tx,batch);
      },{timeout:30000});
      cursor=batch.id;count++;
    }
    console.log("Batches checked for evidence:",count,"company",companyId);
  }finally{await db.$disconnect();}
}
main().catch(()=>{console.error("Backfill failed. Check company, database and migration status.");process.exitCode=1;});
