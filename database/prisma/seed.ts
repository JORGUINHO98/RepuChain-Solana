import "dotenv/config";
import { createDatabase } from "../src";
import { provisionCompany } from "../src/bootstrap";
const url=process.env.DATABASE_URL;
const password=process.env.SEED_ADMIN_PASSWORD;
if(!url||!password||password.length<12) throw new Error("Configura DATABASE_URL y SEED_ADMIN_PASSWORD (mínimo 12 caracteres).");
const db=createDatabase(url);
async function seed(){
  const {company,adminId}=await provisionCompany(db,{slug:"demo",name:"RepuChain Demo",adminEmail:process.env.SEED_ADMIN_EMAIL??"admin@repuchain.local",adminPassword:password!});
  const companyId=company.id;
  await db.$transaction(async tx=>{
    const category=await tx.category.upsert({where:{companyId_name:{companyId,name:"Filtros"}},create:{companyId,name:"Filtros"},update:{}});
    const brand=await tx.brand.upsert({where:{companyId_name:{companyId,name:"Marca de demostración"}},create:{companyId,name:"Marca de demostración"},update:{}});
    const product=await tx.product.upsert({where:{companyId_sku:{companyId,sku:"FIL-001"}},create:{companyId,sku:"FIL-001",name:"Filtro de aceite de demostración",unitPrice:"65.50",minimumStock:5,categoryId:category.id,brandId:brand.id},update:{}});
    const supplier=await tx.supplier.upsert({where:{companyId_code:{companyId,code:"PROV-001"}},create:{companyId,code:"PROV-001",name:"Proveedor de demostración"},update:{}});
    for(const [code,name]of [["CENTRAL","Almacén central"],["SUCURSAL","Almacén sucursal"]]){
      await tx.warehouse.upsert({where:{companyId_code:{companyId,code:code!}},create:{companyId,code:code!,name:name!},update:{}});
    }
    await tx.inventoryBatch.upsert({where:{companyId_code:{companyId,code:"LOTE-DEMO-001"}},create:{companyId,code:"LOTE-DEMO-001",productId:product.id,supplierId:supplier.id},update:{}});
    await tx.auditLog.create({data:{companyId,actorId:adminId,action:"seed.run",entityId:companyId,metadata:{initialStock:0}}});
  });
  console.log("Seed completado: empresa demo. Contraseña conservada en database/.env; no se muestran credenciales.");
}
seed().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>db.$disconnect());
