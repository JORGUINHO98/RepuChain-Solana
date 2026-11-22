ALTER TABLE inventory_movements ADD CONSTRAINT inventory_movements_id_companyId_key UNIQUE(id,"companyId");
CREATE TABLE trade_documents (
  id UUID PRIMARY KEY, "companyId" UUID NOT NULL REFERENCES companies(id),
  "actorId" UUID NOT NULL, type VARCHAR(8) NOT NULL CHECK(type IN ('PURCHASE','SALE')),
  reference VARCHAR(64) NOT NULL, "supplierId" UUID, counterparty VARCHAR(160) NOT NULL,
  "warehouseId" UUID NOT NULL, "idempotencyKey" UUID NOT NULL, "requestHash" CHAR(64) NOT NULL,
  total DECIMAL(24,2) NOT NULL CHECK(total >= 0), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY("actorId","companyId") REFERENCES users(id,"companyId"),
  FOREIGN KEY("supplierId","companyId") REFERENCES suppliers(id,"companyId"),
  FOREIGN KEY("warehouseId","companyId") REFERENCES warehouses(id,"companyId"),
  UNIQUE(id,"companyId"), UNIQUE("companyId","idempotencyKey"), UNIQUE("companyId",type,reference),
  CHECK((type='PURCHASE' AND "supplierId" IS NOT NULL) OR (type='SALE' AND "supplierId" IS NULL))
);
CREATE INDEX trade_documents_companyId_createdAt_idx ON trade_documents("companyId","createdAt");
CREATE TABLE trade_lines (
  id UUID PRIMARY KEY, "companyId" UUID NOT NULL, "documentId" UUID NOT NULL,
  "batchId" UUID NOT NULL, "movementId" UUID NOT NULL UNIQUE,
  quantity INTEGER NOT NULL CHECK(quantity > 0), "unitPrice" DECIMAL(12,2) NOT NULL CHECK("unitPrice" >= 0),
  total DECIMAL(24,2) NOT NULL CHECK(total=quantity*"unitPrice"),
  FOREIGN KEY("documentId","companyId") REFERENCES trade_documents(id,"companyId"),
  FOREIGN KEY("batchId","companyId") REFERENCES inventory_batches(id,"companyId"),
  FOREIGN KEY("movementId","companyId") REFERENCES inventory_movements(id,"companyId"),
  UNIQUE("documentId","batchId"), UNIQUE("movementId","companyId")
);
CREATE TRIGGER trade_documents_immutable BEFORE UPDATE OR DELETE ON trade_documents FOR EACH ROW EXECUTE FUNCTION reject_history_mutation();
CREATE TRIGGER trade_lines_immutable BEFORE UPDATE OR DELETE ON trade_lines FOR EACH ROW EXECUTE FUNCTION reject_history_mutation();
INSERT INTO permissions(code,description) VALUES
 ('purchases:read','Consultar compras'),('purchases:write','Registrar compras'),
 ('sales:read','Consultar ventas'),('sales:write','Registrar ventas') ON CONFLICT DO NOTHING;
INSERT INTO role_permissions("roleId","permissionCode")
 SELECT r.id,p.code FROM roles r CROSS JOIN permissions p
 WHERE p.code IN ('purchases:read','sales:read') AND r.name IN ('ADMIN','MANAGER','OPERATOR','VIEWER')
 OR p.code IN ('purchases:write','sales:write') AND r.name IN ('ADMIN','MANAGER')
 ON CONFLICT DO NOTHING;
