ALTER TABLE inventory_batches ADD COLUMN "evidenceSequence" INTEGER NOT NULL DEFAULT 0 CHECK ("evidenceSequence" >= 0);
CREATE TABLE blockchain_bindings (
  "companyId" UUID PRIMARY KEY REFERENCES companies(id) ON DELETE RESTRICT,
  authority VARCHAR(44) NOT NULL, "programId" VARCHAR(44) NOT NULL,
  network VARCHAR(16) NOT NULL CHECK (network IN ('localnet','devnet')),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE evidence_outbox (
  id UUID PRIMARY KEY, "companyId" UUID NOT NULL, "batchId" UUID NOT NULL, "eventId" UUID NOT NULL,
  sequence INTEGER NOT NULL CHECK (sequence >= 0), "canonicalPayload" TEXT NOT NULL,
  "payloadHash" CHAR(64) NOT NULL CHECK ("payloadHash" ~ '^[0-9a-f]{64}$'),
  status VARCHAR(16) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','PROCESSING','CONFIRMED','FAILED')),
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "leaseToken" UUID, "lockedUntil" TIMESTAMP(3), "lastError" VARCHAR(80),
  signature VARCHAR(88), account VARCHAR(44), "evidenceHash" CHAR(64), "confirmedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("batchId","companyId") REFERENCES inventory_batches(id,"companyId") ON DELETE RESTRICT,
  UNIQUE ("companyId","eventId"), UNIQUE ("batchId",sequence),
  CHECK (status <> 'CONFIRMED' OR (signature IS NOT NULL AND account IS NOT NULL AND "evidenceHash" IS NOT NULL AND "confirmedAt" IS NOT NULL))
);
CREATE INDEX evidence_outbox_status_available ON evidence_outbox(status,"availableAt");
CREATE TABLE evidence_transactions (
  id UUID PRIMARY KEY, "outboxId" UUID NOT NULL REFERENCES evidence_outbox(id) ON DELETE RESTRICT,
  signature VARCHAR(88) NOT NULL UNIQUE, wire TEXT NOT NULL,
  "lastValidBlockHeight" BIGINT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX evidence_transactions_outbox_created ON evidence_transactions("outboxId","createdAt");
CREATE FUNCTION protect_evidence_payload() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Evidence cannot be deleted' USING ERRCODE='23514'; END IF;
  IF OLD.status = 'CONFIRMED' OR
    ROW(OLD.id,OLD."companyId",OLD."batchId",OLD."eventId",OLD.sequence,OLD."canonicalPayload",OLD."payloadHash",OLD."createdAt")
    IS DISTINCT FROM
    ROW(NEW.id,NEW."companyId",NEW."batchId",NEW."eventId",NEW.sequence,NEW."canonicalPayload",NEW."payloadHash",NEW."createdAt")
  THEN RAISE EXCEPTION 'Evidence payload is immutable' USING ERRCODE='23514'; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER evidence_payload_immutable BEFORE UPDATE OR DELETE ON evidence_outbox FOR EACH ROW EXECUTE FUNCTION protect_evidence_payload();
CREATE TRIGGER evidence_transactions_immutable BEFORE UPDATE OR DELETE ON evidence_transactions FOR EACH ROW EXECUTE FUNCTION reject_history_mutation();
CREATE TRIGGER blockchain_binding_immutable BEFORE UPDATE OR DELETE ON blockchain_bindings FOR EACH ROW EXECUTE FUNCTION reject_history_mutation();
