ALTER TABLE stock ADD CONSTRAINT stock_non_negative CHECK (quantity >= 0);
ALTER TABLE products ADD CONSTRAINT product_non_negative CHECK ("unitPrice" >= 0 AND "minimumStock" >= 0);
ALTER TABLE vehicle_models ADD CONSTRAINT vehicle_year_range CHECK ("yearFrom" >= 1886 AND "yearTo" <= 2200 AND "yearFrom" <= "yearTo");
ALTER TABLE inventory_movements ADD CONSTRAINT movement_positive CHECK (quantity > 0);
ALTER TABLE inventory_movements ADD CONSTRAINT movement_direction CHECK (
  (type = 'IN' AND "sourceWarehouseId" IS NULL AND "destinationWarehouseId" IS NOT NULL) OR
  (type = 'OUT' AND "sourceWarehouseId" IS NOT NULL AND "destinationWarehouseId" IS NULL) OR
  (type = 'TRANSFER' AND "sourceWarehouseId" IS NOT NULL AND "destinationWarehouseId" IS NOT NULL AND "sourceWarehouseId" <> "destinationWarehouseId")
);
ALTER TABLE sessions ADD CONSTRAINT session_expiration CHECK ("expiresAt" > "createdAt");
CREATE FUNCTION reject_history_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Historical records are append-only' USING ERRCODE = '23514';
END;
$$;
CREATE TRIGGER inventory_history_immutable BEFORE UPDATE OR DELETE ON inventory_movements
FOR EACH ROW EXECUTE FUNCTION reject_history_mutation();
CREATE TRIGGER audit_history_immutable BEFORE UPDATE OR DELETE ON audit_logs
FOR EACH ROW EXECUTE FUNCTION reject_history_mutation();
