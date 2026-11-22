import {beforeAll,afterAll,describe,it,expect} from "vitest";
import {randomUUID} from "node:crypto";
import {setup,teardown,request,db,companyId,otherToken,login,password} from "./helpers";
beforeAll(setup);afterAll(teardown);
let warehouseId:string,supplierId:string,batchId:string,secondBatch:string,documentId:string;
const key=randomUUID();
const purchase=()=>({reference:"PURCHASE-001",warehouseId,supplierId,lines:[{batchId,quantity:10,unitPrice:"0.10"}]});
describe("Fase 5 · compras, ventas y dashboard",()=>{
 it("muestra un dashboard vacío limitado a la empresa",async()=>{
  const r=await request("GET","/dashboard");expect(r.status).toBe(200);expect(r.body.units).toBe(0);expect(r.body.days).toHaveLength(7);expect(r.body.recent).toEqual([]);
 });
 it("registra una compra exacta junto con stock, auditoría y evidencia",async()=>{
  const p=await request("POST","/products",{sku:"TRADE",name:"Filtro",minimumStock:20});
  warehouseId=(await request("POST","/warehouses",{code:"TRADE",name:"Central"})).body.id;
  supplierId=(await request("POST","/suppliers",{code:"TRADE",name:"Proveedor"})).body.id;
  batchId=(await request("POST","/batches",{code:"TRADE",productId:p.body.id,supplierId})).body.id;
  secondBatch=(await request("POST","/batches",{code:"EMPTY",productId:p.body.id,supplierId})).body.id;
  const r=await request("POST","/purchases",purchase(),undefined,key);
  expect(r.status).toBe(201);expect(r.body.total).toBe("1");expect(r.body.lines).toHaveLength(1);documentId=r.body.id;
  expect((await db.stock.findFirstOrThrow({where:{companyId,batchId}})).quantity).toBe(10);
  expect(await db.evidenceOutbox.count({where:{companyId,batchId}})).toBe(2);
  expect(await db.auditLog.count({where:{companyId,entityId:documentId}})).toBe(1);
 });
 it("reintenta sin duplicar y rechaza la misma clave con otro contenido",async()=>{
  const r=await request("POST","/purchases",purchase(),undefined,key);expect(r.body.id).toBe(documentId);
  expect(await db.tradeDocument.count({where:{companyId}})).toBe(1);
  expect((await request("POST","/purchases",{...purchase(),reference:"CHANGED"},undefined,key)).status).toBe(409);
 });
 it("registra una venta y descuenta existencias con importes decimales exactos",async()=>{
  const r=await request("POST","/sales",{reference:"SALE-001",warehouseId,counterparty:"Cliente",lines:[{batchId,quantity:3,unitPrice:"0.15"}]},undefined,randomUUID());
  expect(r.status).toBe(201);expect(r.body.total).toBe("0.45");
  expect((await db.stock.findFirstOrThrow({where:{companyId,batchId}})).quantity).toBe(7);
 });
 it("revierte todo el documento cuando una línea no tiene stock",async()=>{
  const movements=await db.inventoryMovement.count({where:{companyId}}),evidence=await db.evidenceOutbox.count({where:{companyId}});
  const r=await request("POST","/sales",{reference:"FAIL-001",warehouseId,counterparty:"Cliente",lines:[{batchId,quantity:1,unitPrice:"2"},{batchId:secondBatch,quantity:1,unitPrice:"2"}]},undefined,randomUUID());
  expect(r.status).toBe(409);expect(await db.tradeDocument.count({where:{companyId,reference:"FAIL-001"}})).toBe(0);
  expect(await db.inventoryMovement.count({where:{companyId}})).toBe(movements);expect(await db.evidenceOutbox.count({where:{companyId}})).toBe(evidence);
  expect((await db.stock.findFirstOrThrow({where:{companyId,batchId}})).quantity).toBe(7);
 });
 it("impide referencias de otra empresa y mantiene listas aisladas",async()=>{
  expect((await request("POST","/purchases",purchase(),otherToken,randomUUID())).status).toBe(404);
  expect((await request("GET","/purchases",undefined,otherToken)).body.total).toBe(0);
  expect((await request("GET","/dashboard",undefined,otherToken)).body.units).toBe(0);
 });
 it("permite lectura al rol VIEWER y bloquea escrituras comerciales",async()=>{
  const role=await db.role.findFirstOrThrow({where:{companyId,name:"VIEWER"}});
  expect((await request("POST","/users",{name:"Lector",email:"tradeviewer@test.local",password,roleId:role.id})).status).toBe(201);
  const token=(await login("tradeviewer@test.local")).accessToken;
  expect((await request("GET","/purchases",undefined,token)).status).toBe(200);
  expect((await request("POST","/purchases",purchase(),token,randomUUID())).status).toBe(403);
  expect((await request("POST","/sales",{reference:"DENIED",warehouseId,counterparty:"Cliente",lines:[{batchId,quantity:1,unitPrice:"1"}]},token,randomUUID())).status).toBe(403);
 });
 it("resume stock, actividad y mínimos desde los registros reales",async()=>{
  const r=await request("GET","/dashboard");expect(r.status).toBe(200);expect(r.body.units).toBe(7);expect(r.body.products).toBe(1);expect(r.body.batches).toBe(2);
  expect(r.body.days.reduce((n:number,d:any)=>n+d.in,0)).toBe(10);expect(r.body.days.reduce((n:number,d:any)=>n+d.out,0)).toBe(3);
  expect(r.body.lowStock[0].quantity).toBe(7);expect(r.body.recent).toHaveLength(2);
 });
 it("protege el historial comercial contra modificaciones",async()=>{
  await expect(db.tradeDocument.update({where:{id:documentId},data:{reference:"ALTERED"}})).rejects.toThrow();
  const line=await db.tradeLine.findFirstOrThrow({where:{documentId}});
  await expect(db.tradeLine.delete({where:{id:line.id}})).rejects.toThrow();
 });
 it("rechaza lotes repetidos, importes negativos y cantidades fraccionarias",async()=>{
  const p=purchase();
  expect((await request("POST","/purchases",{...p,lines:[...p.lines,...p.lines]},undefined,randomUUID())).status).toBe(400);
  expect((await request("POST","/purchases",{...p,lines:[{batchId,quantity:1,unitPrice:"-1"}]},undefined,randomUUID())).status).toBe(400);
  expect((await request("POST","/purchases",{...p,lines:[{batchId,quantity:1.5,unitPrice:"1"}]},undefined,randomUUID())).status).toBe(400);
 });
});
