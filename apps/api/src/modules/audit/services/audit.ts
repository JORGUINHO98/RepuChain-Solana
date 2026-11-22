import type { Prisma } from "@repuchain/database";
import type { AuthenticatedUser } from "@repuchain/shared-types";
export function audit(tx: Prisma.TransactionClient, user: Pick<AuthenticatedUser,"id"|"companyId">, action: string, entityId: string, metadata: Prisma.InputJsonObject = {}) {
  return tx.auditLog.create({ data: { companyId: user.companyId, actorId: user.id, action, entityId, metadata } });
}
