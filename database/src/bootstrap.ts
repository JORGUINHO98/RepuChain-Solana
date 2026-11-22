import { DEFAULT_ROLES, PERMISSIONS } from "@repuchain/shared-types";
import { hashPassword } from "@repuchain/security";
import type { PrismaClient } from "./generated/client";

export async function provisionCompany(db:PrismaClient,input:{slug:string;name:string;adminEmail:string;adminPassword:string}) {
  const passwordHash=await hashPassword(input.adminPassword);
  return db.$transaction(async tx=>{
    const company=await tx.company.upsert({where:{slug:input.slug},create:{slug:input.slug,name:input.name},update:{}});
    await tx.permission.createMany({data:PERMISSIONS.map(code=>({code,description:code})),skipDuplicates:true});
    for(const [name,permissions] of Object.entries(DEFAULT_ROLES)){
      const role=await tx.role.upsert({where:{companyId_name:{companyId:company.id,name}},create:{companyId:company.id,name},update:{}});
      await tx.rolePermission.createMany({data:permissions.map(permissionCode=>({roleId:role.id,permissionCode})),skipDuplicates:true});
    }
    const adminRole=await tx.role.findUniqueOrThrow({where:{companyId_name:{companyId:company.id,name:"ADMIN"}}});
    const admin=await tx.user.upsert({
      where:{companyId_email:{companyId:company.id,email:input.adminEmail.toLowerCase()}},
      create:{companyId:company.id,roleId:adminRole.id,email:input.adminEmail.toLowerCase(),name:"Administrador",passwordHash},
      update:{},
    });
    return {company,adminId:admin.id};
  });
}
