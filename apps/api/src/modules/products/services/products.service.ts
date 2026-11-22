import { ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { DatabaseService } from "../../../database/database.service";
import { serializable } from "../../../common/transaction";
import type { AuthenticatedUser } from "@repuchain/shared-types";
import type { ProductInput, UpdateProductInput, ListQuery } from "@repuchain/validation";
import { audit } from "../../audit/services/audit";
@Injectable()
export class ProductsService {
  constructor(@Inject(DatabaseService) private readonly db: DatabaseService) {}
  async list(actor: AuthenticatedUser, query: ListQuery) {
    const where = { companyId: actor.companyId, ...(query.search ? { name: { contains: query.search, mode: "insensitive" as const } } : {}) };
    const [items,total] = await this.db.client.$transaction([this.db.client.product.findMany({ where, orderBy: { createdAt: "desc" }, skip: (query.page-1)*query.limit, take: query.limit }), this.db.client.product.count({ where })]);
    return { items,total,page:query.page,limit:query.limit };
  }
  async get(actor: AuthenticatedUser, id: string) {
    const item = await this.db.client.product.findFirst({ where: { id, companyId: actor.companyId } });
    if (!item) throw new NotFoundException("Registro no encontrado");
    return item;
  }
  async create(actor: AuthenticatedUser, input: ProductInput) {
    return this.db.client.$transaction(async tx => {
      if (input.categoryId && !await tx.category.findFirst({ where: { id: input.categoryId, companyId: actor.companyId } })) throw new NotFoundException("Categoría no encontrada");
      if (input.brandId && !await tx.brand.findFirst({ where: { id: input.brandId, companyId: actor.companyId } })) throw new NotFoundException("Marca no encontrada");
      const item = await tx.product.create({ data: { ...input, companyId: actor.companyId } });
      await audit(tx, actor, "products.create", item.id);
      return item;
    });
  }
  async update(actor: AuthenticatedUser, id: string, input: UpdateProductInput) {
    return this.db.client.$transaction(async tx => {
      
      if (!await tx.product.findFirst({ where: { id, companyId: actor.companyId } })) throw new NotFoundException("Registro no encontrado");
      
      if (input.categoryId && !await tx.category.findFirst({ where: { id: input.categoryId, companyId: actor.companyId } })) throw new NotFoundException("Categoría no encontrada");
      if (input.brandId && !await tx.brand.findFirst({ where: { id: input.brandId, companyId: actor.companyId } })) throw new NotFoundException("Marca no encontrada");
      const item = await tx.product.update({ where: { id_companyId: { id, companyId: actor.companyId } }, data: input });
      await audit(tx, actor, "products.update", id, { fields: Object.keys(input) });
      return item;
    });
  }
}
