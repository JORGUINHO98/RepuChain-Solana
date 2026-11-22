import {beforeAll,afterAll,describe,it,expect} from "vitest";
import {randomUUID} from "node:crypto";
import {setup,teardown,request,db,companyId,otherToken,login,password} from "./helpers";
import {parseBatchQr} from "../../packages/utils/src/qr";
beforeAll(setup);afterAll(teardown);
let batchId:string;
describe("Fase 6 · consulta móvil y QR",()=>{
 it("devuelve lote y existencias reales con identificador QR",async()=>{
  const p=await request("POST","/products",{sku:"MOBILE",name:"Filtro móvil"});
  const w=await request("POST","/warehouses",{code:"MOBILE",name:"Central móvil"});
  const b=await request("POST","/batches",{code:"MOBILE",productId:p.body.id});batchId=b.body.id;
  await request("POST","/movements",{batchId,type:"IN",quantity:4,destinationWarehouseId:w.body.id,reason:"Recepción móvil"},undefined,randomUUID());
  const result=await request("GET","/batches/"+batchId);expect(result.status).toBe(200);expect(result.body.stock[0].quantity).toBe(4);expect(result.body.product.name).toBe("Filtro móvil");expect(parseBatchQr(result.body.qrPayload)).toEqual({companyId,batchId});
 });
 it("genera un SVG estable sin precios ni credenciales en el contenido",async()=>{
  const qr=await request("GET","/batches/"+batchId+"/qr");expect(qr.status).toBe(200);expect(qr.body.svg).toContain("<svg");expect(qr.body.svg).toContain("<path");expect(parseBatchQr(qr.body.payload)).toEqual({companyId,batchId});
  expect((await request("GET","/batches/"+batchId+"/qr")).body).toEqual(qr.body);
 });
 it("bloquea consulta y QR de otra empresa, sin sesión y con UUID inválido",async()=>{
  for(const path of ["/batches/"+batchId,"/batches/"+batchId+"/qr"]){expect((await request("GET",path,undefined,otherToken)).status).toBe(404);expect((await request("GET",path,undefined,"")).status).toBe(401);}
  expect((await request("GET","/batches/invalid")).status).toBe(400);
 });
 it("permite escanear al lector pero no registrar movimientos",async()=>{
  const role=await db.role.findFirstOrThrow({where:{companyId,name:"VIEWER"}});
  await request("POST","/users",{name:"Lector móvil",email:"mobile@test.local",password,roleId:role.id});
  const token=(await login("mobile@test.local")).accessToken;
  expect((await request("GET","/batches/"+batchId,undefined,token)).status).toBe(200);
  expect((await request("GET","/batches/"+batchId+"/qr",undefined,token)).status).toBe(200);
  expect((await request("POST","/movements",{},token,randomUUID())).status).toBe(403);
 });
});
