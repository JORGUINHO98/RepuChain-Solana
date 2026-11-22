import { afterAll,beforeAll,describe,expect,it } from "vitest";
import { randomUUID } from "node:crypto";
import { sha256 } from "../../packages/security/src";
import { setup,teardown,request,login,db,password,slug,adminToken,otherToken,companyId,otherCompanyId,adminId } from "./helpers";
beforeAll(setup);
afterAll(teardown);
let productId:string,batchId:string,sourceId:string,destinationId:string,foreignWarehouseId:string;
let categoryId:string,brandId:string,supplierId:string,operatorId:string,operatorToken:string,viewerToken:string,viewerId:string;
let adminRoleId:string,viewerRoleId:string,movementId:string;
async function create(path:string,body:unknown,token=adminToken){
  const r=await request("POST",path,body,token);expect(r.status,JSON.stringify(r.body)).toBe(201);return r.body;
}
async function balance(warehouseId:string){
  const r=await request("GET","/inventory?warehouseId="+warehouseId+"&batchId="+batchId);
  expect(r.status).toBe(200);return r.body.items[0]?.quantity??0;
}
describe("Fase 2 · API real y PostgreSQL",()=>{
  it("protege endpoints y comprueba disponibilidad de PostgreSQL",async()=>{
    expect((await request("GET","/products",undefined,"")).status).toBe(401);
    expect((await request("GET","/products",undefined,"invalid")).status).toBe(401);
    expect((await request("GET","/health/ready",undefined,"")).body).toEqual({status:"ok",database:"available"});
    const me=await request("GET","/auth/me");
    expect(me.body.companyId).toBe(companyId);expect(me.body.role).toBe("ADMIN");
    expect((await request("GET","/companies/me")).body.id).toBe(companyId);
  });
  it("usa errores de login uniformes y no permite elegir empresa mediante el token",async()=>{
    const bad=await request("POST","/auth/login",{companySlug:slug,email:"admin@test.local",password:"incorrecta"},"");
    const unknown=await request("POST","/auth/login",{companySlug:slug,email:"unknown@test.local",password:"incorrecta"},"");
    expect(bad.status).toBe(401);expect(unknown.status).toBe(401);expect(bad.body.message).toBe(unknown.body.message);
    expect((await request("GET","/companies/me",undefined,otherToken)).body.id).toBe(otherCompanyId);
  });
  it("crea catálogo, proveedor, almacenes y un lote sin inventario ficticio",async()=>{
    categoryId=(await create("/categories",{name:"Filtros"})).id;
    brandId=(await create("/brands",{name:"Marca Test"})).id;
    supplierId=(await create("/suppliers",{code:"PROV-01",name:"Proveedor Test",email:"prov@test.local"})).id;
    sourceId=(await create("/warehouses",{code:"CENTRAL",name:"Central",address:"Calle 1"})).id;
    destinationId=(await create("/warehouses",{code:"SUCURSAL",name:"Sucursal"})).id;
    foreignWarehouseId=(await create("/warehouses",{code:"CENTRAL",name:"Otra empresa"},otherToken)).id;
    const product=await create("/products",{sku:"fil-01",name:"Filtro",categoryId,brandId,unitPrice:"125.50",minimumStock:4,description:"Descripción"});
    productId=product.id;expect(product.sku).toBe("FIL-01");expect(product.unitPrice).toBe("125.5");
    batchId=(await create("/batches",{code:"LOTE-01",productId,supplierId})).id;
    expect(await balance(sourceId)).toBe(0);
  });
  it("actualiza sin borrar campos omitidos y rechaza duplicados",async()=>{
    const updated=await request("PATCH","/products/"+productId,{name:"Filtro actualizado"});
    expect(updated.status).toBe(200);expect(updated.body.unitPrice).toBe("125.5");expect(updated.body.minimumStock).toBe(4);expect(updated.body.description).toBe("Descripción");
    const warehouse=await request("PATCH","/warehouses/"+sourceId,{name:"Central actualizado"});
    expect(warehouse.body.address).toBe("Calle 1");
    expect((await request("POST","/products",{sku:"FIL-01",name:"Duplicado"})).status).toBe(409);
    expect((await request("POST","/warehouses",{code:"CENTRAL",name:"Duplicado"})).status).toBe(409);
    const supplier=await request("PATCH","/suppliers/"+supplierId,{phone:"123456"});
    expect(supplier.status).toBe(200);expect(supplier.body.email).toBe("prov@test.local");
  });
  it("aísla las lecturas y escrituras por empresa",async()=>{
    expect((await request("GET","/products",undefined,otherToken)).body.total).toBe(0);
    expect((await request("GET","/products/"+productId,undefined,otherToken)).status).toBe(404);
    expect((await request("PATCH","/products/"+productId,{name:"Ataque"},otherToken)).status).toBe(404);
    expect((await request("POST","/batches",{code:"BAD",productId},otherToken)).status).toBe(404);
    expect((await request("POST","/products",{sku:"BAD",name:"Ataque",categoryId},otherToken)).status).toBe(404);
    expect((await request("GET","/audit",undefined,otherToken)).body.items.every((i:any)=>i.companyId===otherCompanyId)).toBe(true);
  });
  it("valida formatos y rechaza asignaciones de campos internos",async()=>{
    expect((await request("POST","/products",{sku:"X",name:"X",companyId:otherCompanyId})).status).toBe(400);
    expect((await request("POST","/products",{sku:"X",name:"X",unitPrice:"-1"})).status).toBe(400);
    expect((await request("POST","/products",{sku:"X",name:"X",minimumStock:-1})).status).toBe(400);
    expect((await request("GET","/products?page=0")).status).toBe(400);
    expect((await request("GET","/products/not-a-uuid")).status).toBe(400);
    expect((await request("PATCH","/products/"+productId,{})).status).toBe(400);
  });
  it("registra compatibilidad vehicular y rechaza años invertidos",async()=>{
    expect((await request("POST","/vehicles",{make:"Toyota",model:"Corolla",yearFrom:2020,yearTo:2000})).status).toBe(400);
    const vehicle=await create("/vehicles",{make:"Toyota",model:"Corolla",yearFrom:2015,yearTo:2020});
    await create("/products/"+productId+"/compatibilities",{vehicleModelId:vehicle.id});
    expect((await request("GET","/products/"+productId+"/compatibilities")).body).toHaveLength(1);
    expect((await request("GET","/products/"+productId+"/compatibilities",undefined,otherToken)).status).toBe(404);
  });
  it("aplica RBAC y oculta hashes de contraseña",async()=>{
    const roles=await request("GET","/roles");
    adminRoleId=roles.body.find((r:any)=>r.name==="ADMIN").id;
    viewerRoleId=roles.body.find((r:any)=>r.name==="VIEWER").id;
    const operatorRole=roles.body.find((r:any)=>r.name==="OPERATOR").id;
    const viewer=await create("/users",{name:"Lector",email:"viewer@test.local",password,roleId:viewerRoleId});
    viewerId=viewer.id;expect(viewer.passwordHash).toBeUndefined();
    operatorId=(await create("/users",{name:"Operador",email:"operator@test.local",password,roleId:operatorRole})).id;
    viewerToken=(await login("viewer@test.local")).accessToken;
    operatorToken=(await login("operator@test.local")).accessToken;
    expect((await request("GET","/inventory",undefined,viewerToken)).status).toBe(200);
    expect((await request("POST","/products",{sku:"NO",name:"No"},viewerToken)).status).toBe(403);
    expect((await request("GET","/users",undefined,operatorToken)).status).toBe(403);
    expect((await request("POST","/movements",{batchId,type:"IN",quantity:1,destinationWarehouseId:sourceId,reason:"Entrada"},viewerToken,randomUUID())).status).toBe(403);
    const users=await request("GET","/users");
    expect(users.body.items.every((u:any)=>!("passwordHash" in u))).toBe(true);
  });
  it("registra una entrada una sola vez y detecta cambios en su clave",async()=>{
    const input={batchId,type:"IN",quantity:10,destinationWarehouseId:sourceId,reason:"Recepción"};
    const key=randomUUID();
    const a=await request("POST","/movements",input,operatorToken,key);
    const b=await request("POST","/movements",input,operatorToken,key);
    expect(a.status,JSON.stringify(a.body)).toBe(201);expect(b.status).toBe(201);expect(a.body.id).toBe(b.body.id);
    movementId=a.body.id;expect(await balance(sourceId)).toBe(10);
    expect((await request("POST","/movements",{...input,quantity:11},operatorToken,key)).status).toBe(409);
    expect(await db.inventoryMovement.count({where:{companyId,idempotencyKey:key}})).toBe(1);
    expect(await db.auditLog.count({where:{companyId,entityId:movementId,action:"inventory.in"}})).toBe(1);
  });
  it("resuelve reintentos concurrentes sin duplicar existencias",async()=>{
    const key=randomUUID(),input={batchId,type:"IN",quantity:3,destinationWarehouseId:sourceId,reason:"Recepción concurrente"};
    const results=await Promise.all(Array.from({length:5},()=>request("POST","/movements",input,adminToken,key)));
    expect(results.map(r=>r.status)).toEqual([201,201,201,201,201]);
    expect(new Set(results.map(r=>r.body.id)).size).toBe(1);expect(await balance(sourceId)).toBe(13);
  });
  it("impide sobreventa con dos salidas simultáneas",async()=>{
    const input={batchId,type:"OUT",quantity:10,sourceWarehouseId:sourceId,reason:"Salida concurrente"};
    const results=await Promise.all([request("POST","/movements",input,adminToken,randomUUID()),request("POST","/movements",input,adminToken,randomUUID())]);
    expect(results.map(r=>r.status).sort()).toEqual([201,409]);expect(await balance(sourceId)).toBe(3);
  });
  it("transfiere de forma atómica y revierte salidas insuficientes",async()=>{
    const input={batchId,type:"TRANSFER",quantity:2,sourceWarehouseId:sourceId,destinationWarehouseId:destinationId,reason:"Reposición"};
    expect((await request("POST","/movements",input,adminToken,randomUUID())).status).toBe(201);
    expect(await balance(sourceId)).toBe(1);expect(await balance(destinationId)).toBe(2);
    const before=await db.inventoryMovement.count({where:{companyId}});
    const auditBefore=await db.auditLog.count({where:{companyId}});
    expect((await request("POST","/movements",input,adminToken,randomUUID())).status).toBe(409);
    expect(await balance(sourceId)).toBe(1);expect(await balance(destinationId)).toBe(2);
    expect(await db.inventoryMovement.count({where:{companyId}})).toBe(before);
    expect(await db.auditLog.count({where:{companyId}})).toBe(auditBefore);
  });
  it("rechaza movimientos inválidos y almacenes de otra empresa",async()=>{
    const input={batchId,type:"IN",quantity:1,destinationWarehouseId:sourceId,reason:"Prueba"};
    expect((await request("POST","/movements",input)).status).toBe(400);
    expect((await request("POST","/movements",input,adminToken,"invalid")).status).toBe(400);
    expect((await request("POST","/movements",{...input,quantity:-1},adminToken,randomUUID())).status).toBe(400);
    expect((await request("POST","/movements",{...input,destinationWarehouseId:foreignWarehouseId},adminToken,randomUUID())).status).toBe(404);
    expect((await request("POST","/movements",{...input,type:"TRANSFER",sourceWarehouseId:sourceId},adminToken,randomUUID())).status).toBe(400);
    expect(await balance(sourceId)).toBe(1);
    expect((await request("PATCH","/warehouses/"+sourceId,{active:false})).status).toBe(409);
  });
  it("hace cumplir restricciones de datos y mantiene inmutable el historial",async()=>{
    await expect(db.stock.update({where:{companyId_batchId_warehouseId:{companyId,batchId,warehouseId:sourceId}},data:{quantity:-1}})).rejects.toThrow();
    await expect(db.inventoryMovement.update({where:{id:movementId},data:{quantity:99}})).rejects.toThrow();
    await expect(db.inventoryMovement.delete({where:{id:movementId}})).rejects.toThrow();
    const log=await db.auditLog.findFirstOrThrow({where:{companyId,entityId:movementId}});
    await expect(db.auditLog.update({where:{id:log.id},data:{action:"tampered"}})).rejects.toThrow();
    await expect(db.product.create({data:{companyId:otherCompanyId,sku:"CROSS",name:"Cross",categoryId}})).rejects.toThrow();
    expect(await balance(sourceId)).toBe(1);
  });
  it("protege al último administrador y revoca usuarios desactivados",async()=>{
    expect((await request("PATCH","/users/"+adminId,{active:false})).status).toBe(409);
    expect((await request("PATCH","/users/"+adminId,{roleId:viewerRoleId})).status).toBe(409);
    expect((await request("PATCH","/users/"+operatorId,{active:false})).status).toBe(200);
    expect((await request("GET","/inventory",undefined,operatorToken)).status).toBe(401);
    expect((await request("PATCH","/users/"+viewerId,{roleId:adminRoleId})).status).toBe(200);
    expect((await request("GET","/inventory",undefined,viewerToken)).status).toBe(401);
  });
  it("rota refresh tokens, detecta reutilización y revoca toda la sesión",async()=>{
    const initial=await login();
    const rotated=await request("POST","/auth/refresh",{refreshToken:initial.refreshToken},"");
    expect(rotated.status).toBe(200);expect(rotated.body.refreshToken).not.toBe(initial.refreshToken);
    const stored=await db.refreshToken.findUniqueOrThrow({where:{tokenHash:sha256(initial.refreshToken)}});
    expect(stored.usedAt).not.toBeNull();expect(stored.tokenHash).not.toBe(initial.refreshToken);
    expect((await request("POST","/auth/refresh",{refreshToken:initial.refreshToken},"")).status).toBe(401);
    expect((await request("GET","/auth/me",undefined,rotated.body.accessToken)).status).toBe(401);
    expect((await request("POST","/auth/refresh",{refreshToken:rotated.body.refreshToken},"")).status).toBe(401);
  });
  it("logout revoca inmediatamente access y refresh tokens",async()=>{
    const session=await login();
    expect((await request("POST","/auth/logout",{},session.accessToken)).status).toBe(200);
    expect((await request("GET","/auth/me",undefined,session.accessToken)).status).toBe(401);
    expect((await request("POST","/auth/refresh",{refreshToken:session.refreshToken},"")).status).toBe(401);
  });
  it("limita las peticiones repetidas",async()=>{
    const results=await Promise.all(Array.from({length:125},()=>request("GET","/health",undefined,"")));
    expect(results.some(r=>r.status===429)).toBe(true);
  });
});
