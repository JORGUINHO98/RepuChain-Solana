import { describe,expect,it } from "vitest";
import { randomUUID } from "node:crypto";
import { movementSchema,productSchema,updateProductSchema,updateWarehouseSchema,vehicleSchema,apiRuntimeEnvironmentSchema } from "../../packages/validation/src";
import { hashPassword,verifyPassword,createRefreshToken,sha256 } from "../../packages/security/src";
describe("Validaciones de fase 2",()=>{
  it("rechaza cantidades inválidas y direcciones inconsistentes",()=>{
    const base={batchId:randomUUID(),type:"IN",destinationWarehouseId:randomUUID(),reason:"Recepción"};
    for(const quantity of [-1,0,1.5,2147483648]) expect(movementSchema.safeParse({...base,quantity}).success).toBe(false);
    expect(movementSchema.safeParse({...base,quantity:1,sourceWarehouseId:randomUUID()}).success).toBe(false);
    const warehouseId=randomUUID();
    expect(movementSchema.safeParse({...base,type:"TRANSFER",quantity:1,sourceWarehouseId:warehouseId,destinationWarehouseId:warehouseId}).success).toBe(false);
  });
  it("rechaza asignación de empresa y precios no decimales",()=>{
    expect(productSchema.safeParse({sku:"A",name:"Filtro",unitPrice:"-1"}).success).toBe(false);
    expect(productSchema.safeParse({sku:"A",name:"Filtro",unitPrice:1.5}).success).toBe(false);
    expect(productSchema.safeParse({sku:"A",name:"Filtro",companyId:randomUUID()}).success).toBe(false);
  });
  it("no aplica defaults de creación a actualizaciones parciales",()=>{
    expect(updateProductSchema.parse({name:"Nuevo nombre"})).toEqual({name:"Nuevo nombre"});
    expect(updateWarehouseSchema.parse({name:"Nueva sucursal"})).toEqual({name:"Nueva sucursal"});
    expect(updateProductSchema.safeParse({}).success).toBe(false);
  });
  it("rechaza rangos invertidos y secretos débiles",()=>{
    expect(vehicleSchema.safeParse({make:"Toyota",model:"Corolla",yearFrom:2020,yearTo:2000}).success).toBe(false);
    expect(apiRuntimeEnvironmentSchema.safeParse({DATABASE_URL:"postgresql://localhost/demo",JWT_SECRET:"weak"}).success).toBe(false);
  });
  it("scrypt usa salt aleatorio y verifica sin guardar la contraseña",async()=>{
    const password="Una contraseña de prueba 123";
    const a=await hashPassword(password),b=await hashPassword(password);
    expect(a).not.toEqual(b);
    expect(a).not.toContain(password);
    expect(await verifyPassword(password,a)).toBe(true);
    expect(await verifyPassword("incorrecta",a)).toBe(false);
    expect(await verifyPassword(password,"malformed")).toBe(false);
    const token=createRefreshToken();
    expect(token).toHaveLength(64);
    expect(sha256(token)).toHaveLength(64);
    expect(sha256(token)).not.toBe(token);
  });
});
