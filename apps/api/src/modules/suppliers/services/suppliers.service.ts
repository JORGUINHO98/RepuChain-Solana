import { ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { DatabaseService } from "../../../database/database.service";
import { serializable } from "../../../common/transaction";
import type { AuthenticatedUser } from "@repuchain/shared-types";
import type { SupplierInput, UpdateSupplierInput, ListQuery } from "@repuchain/validation";
import { audit } from "../../audit/services/audit";
@Injectable()
export class SuppliersService {
  constructor(@Inject(DatabaseService) private readonly db: DatabaseService) {}
  async list(actor: AuthenticatedUser, query: ListQuery) {
    const where = { companyId: actor.companyId, ...(query.search ? { name: { contains: query.search, mode: "insensitive" as const } } : {}) };
    const [items,total] = await this.db.client.$transaction([this.db.client.supplier.findMany({ where, orderBy: { createdAt: "desc" }, skip: (query.page-1)*query.limit, take: query.limit }), this.db.client.supplier.count({ where })]);
    return { items,total,page:query.page,limit:query.limit };
  }
  async get(actor: AuthenticatedUser, id: string) {
    const item = await this.db.client.supplier.findFirst({ where: { id, companyId: actor.companyId } });
    if (!item) throw new NotFoundException("Registro no encontrado");
    return item;
  }
  async create(actor: AuthenticatedUser, input: SupplierInput) {
    return this.db.client.$transaction(async tx => {
      const item = await tx.supplier.create({ data: { ...input, companyId: actor.companyId } });
      await audit(tx, actor, "suppliers.create", item.id);
      return item;
    });
  }
  async update(actor: AuthenticatedUser, id: string, input: UpdateSupplierInput) {
    return this.db.client.$transaction(async tx => {
      
      if (!await tx.supplier.findFirst({ where: { id, companyId: actor.companyId } })) throw new NotFoundException("Registro no encontrado");
      
      const item = await tx.supplier.update({ where: { id_companyId: { id, companyId: actor.companyId } }, data: input });
      await audit(tx, actor, "suppliers.update", id, { fields: Object.keys(input) });
      return item;
    });
  }
}
