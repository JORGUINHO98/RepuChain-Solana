import { ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { DatabaseService } from "../../../database/database.service";
import { serializable } from "../../../common/transaction";
import type { AuthenticatedUser } from "@repuchain/shared-types";
import type { WarehouseInput, UpdateWarehouseInput, ListQuery } from "@repuchain/validation";
import { audit } from "../../audit/services/audit";
@Injectable()
export class WarehousesService {
  constructor(@Inject(DatabaseService) private readonly db: DatabaseService) {}
  async list(actor: AuthenticatedUser, query: ListQuery) {
    const where = { companyId: actor.companyId, ...(query.search ? { name: { contains: query.search, mode: "insensitive" as const } } : {}) };
    const [items,total] = await this.db.client.$transaction([this.db.client.warehouse.findMany({ where, orderBy: { createdAt: "desc" }, skip: (query.page-1)*query.limit, take: query.limit }), this.db.client.warehouse.count({ where })]);
    return { items,total,page:query.page,limit:query.limit };
  }
  async get(actor: AuthenticatedUser, id: string) {
    const item = await this.db.client.warehouse.findFirst({ where: { id, companyId: actor.companyId } });
    if (!item) throw new NotFoundException("Registro no encontrado");
    return item;
  }
  async create(actor: AuthenticatedUser, input: WarehouseInput) {
    return this.db.client.$transaction(async tx => {
      const item = await tx.warehouse.create({ data: { ...input, companyId: actor.companyId } });
      await audit(tx, actor, "warehouses.create", item.id);
      return item;
    });
  }
  async update(actor: AuthenticatedUser, id: string, input: UpdateWarehouseInput) {
    return serializable(this.db.client, async tx => {
      await tx.$queryRaw`SELECT id FROM warehouses WHERE id = ${id}::uuid AND "companyId" = ${actor.companyId}::uuid FOR UPDATE`;
      if (!await tx.warehouse.findFirst({ where: { id, companyId: actor.companyId } })) throw new NotFoundException("Registro no encontrado");
      
      if (input.active === false && await tx.stock.count({ where: { companyId: actor.companyId, warehouseId: id, quantity: { gt: 0 } } })) throw new ConflictException("El almacén todavía tiene existencias");
      const item = await tx.warehouse.update({ where: { id_companyId: { id, companyId: actor.companyId } }, data: input });
      await audit(tx, actor, "warehouses.update", id, { fields: Object.keys(input) });
      return item;
    });
  }
}
