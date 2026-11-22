import { z } from "zod";
export const apiEnvironmentSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  HOST: z.string().min(1).default("127.0.0.1"),
  WEB_ORIGIN: z.url().default("http://localhost:3000"),
});
export const apiRuntimeEnvironmentSchema = apiEnvironmentSchema.extend({
  DATABASE_URL: z.string().regex(/^postgres(ql)?:\/\//),
  JWT_SECRET: z.string().min(64).refine(v => !v.includes("REPLACE"), "Genera un secreto con setup:env"),
});
export const healthResponseSchema = z.object({
  status: z.literal("ok"), service: z.literal("repuchain-api"), version: z.string().min(1),
});
const name = z.string().trim().min(1).max(160);
const code = z.string().trim().min(1).max(64).regex(/^[A-Za-z0-9._-]+$/).transform(v => v.toUpperCase());
const uuid = z.uuid();
const email = z.email().max(254).transform(v => v.toLowerCase());
export const passwordSchema = z.string().min(12).max(128);
export const loginSchema = z.object({
  companySlug: z.string().trim().min(1).max(64).toLowerCase(),
  email, password: z.string().min(1).max(128),
}).strict();
export const refreshSchema = z.object({ refreshToken: z.string().regex(/^[A-Za-z0-9_-]{64}$/) }).strict();
export const createUserSchema = z.object({ name, email, password: passwordSchema, roleId: uuid }).strict();
export const updateUserSchema = z.object({ name: name.optional(), roleId: uuid.optional(), active: z.boolean().optional() }).strict().refine(v => Object.keys(v).length > 0);
export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(100000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(100).optional(),
}).strict();
export const namedEntitySchema = z.object({ name: name.max(120) }).strict();
export const productSchema = z.object({
  sku: code, name, description: z.string().trim().max(2000).default(""),
  categoryId: uuid.nullable().optional(), brandId: uuid.nullable().optional(),
  unitPrice: z.string().regex(/^(0|[1-9]\d{0,9})(\.\d{1,2})?$/).default("0"),
  minimumStock: z.number().int().min(0).max(2147483647).default(0),
}).strict();
export const updateProductSchema = productSchema.omit({ description: true, unitPrice: true, minimumStock: true }).partial().extend({ description: z.string().trim().max(2000).optional(), unitPrice: z.string().regex(/^(0|[1-9]\d{0,9})(\.\d{1,2})?$/).optional(), minimumStock: z.number().int().min(0).max(2147483647).optional(), active: z.boolean().optional() }).strict().refine(v => Object.keys(v).length > 0);
export const supplierSchema = z.object({
  code, name, email: email.nullable().optional(),
  phone: z.string().trim().max(40).nullable().optional(),
}).strict();
export const updateSupplierSchema = supplierSchema.partial().extend({ active: z.boolean().optional() }).strict().refine(v => Object.keys(v).length > 0);
export const warehouseSchema = z.object({ code, name, address: z.string().trim().max(500).default("") }).strict();
export const updateWarehouseSchema = warehouseSchema.omit({ address: true }).partial().extend({ address: z.string().trim().max(500).optional(), active: z.boolean().optional() }).strict().refine(v => Object.keys(v).length > 0);
export const vehicleSchema = z.object({
  make: name.max(80), model: name.max(80), yearFrom: z.number().int().min(1886).max(2200), yearTo: z.number().int().min(1886).max(2200),
}).strict().refine(v => v.yearFrom <= v.yearTo, "Rango de años inválido");
export const compatibilitySchema = z.object({ vehicleModelId: uuid }).strict();
export const batchSchema = z.object({ code, productId: uuid, supplierId: uuid.nullable().optional() }).strict();
export const movementSchema = z.object({
  batchId: uuid, type: z.enum(["IN", "OUT", "TRANSFER"]),
  quantity: z.number().int().min(1).max(2147483647),
  sourceWarehouseId: uuid.optional(), destinationWarehouseId: uuid.optional(),
  reason: z.string().trim().min(3).max(500),
}).strict().superRefine((v, ctx) => {
  const valid = v.type === "IN" ? !v.sourceWarehouseId && !!v.destinationWarehouseId
    : v.type === "OUT" ? !!v.sourceWarehouseId && !v.destinationWarehouseId
    : !!v.sourceWarehouseId && !!v.destinationWarehouseId && v.sourceWarehouseId !== v.destinationWarehouseId;
  if (!valid) ctx.addIssue({ code: "custom", message: "Origen y destino incompatibles con el movimiento." });
});
export const inventoryQuerySchema = listQuerySchema.extend({ warehouseId: uuid.optional(), batchId: uuid.optional() });
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type ListQuery = z.infer<typeof listQuerySchema>;
export type ProductInput = z.infer<typeof productSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type SupplierInput = z.infer<typeof supplierSchema>;
export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>;
export type WarehouseInput = z.infer<typeof warehouseSchema>;
export type UpdateWarehouseInput = z.infer<typeof updateWarehouseSchema>;
export type VehicleInput = z.infer<typeof vehicleSchema>;
export type BatchInput = z.infer<typeof batchSchema>;
export type MovementInput = z.infer<typeof movementSchema>;
export type InventoryQuery = z.infer<typeof inventoryQuerySchema>;

const tradeLineSchema=z.object({batchId:uuid,quantity:z.number().int().min(1).max(2147483647),unitPrice:z.string().regex(/^(0|[1-9]\d{0,9})(\.\d{1,2})?$/)}).strict();
const tradeBase=z.object({reference:code,warehouseId:uuid,lines:z.array(tradeLineSchema).min(1).max(20).refine(lines=>new Set(lines.map(l=>l.batchId)).size===lines.length,"No repitas un lote en el documento")});
export const purchaseSchema=tradeBase.extend({supplierId:uuid}).strict();
export const saleSchema=tradeBase.extend({counterparty:name}).strict();
export type TradeInput={reference:string;warehouseId:string;supplierId?:string;counterparty?:string;lines:z.infer<typeof tradeLineSchema>[]};
export const registerSchema=z.object({
 companySlug:z.string().trim().toLowerCase().min(3).max(64).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
 companyName:name, name, email, password:passwordSchema,
}).strict();
export type RegisterInput=z.infer<typeof registerSchema>;