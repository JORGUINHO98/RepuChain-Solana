import { Inject, Injectable } from "@nestjs/common";
import { DatabaseService } from "../../../database/database.service";
import type { AuthenticatedUser } from "@repuchain/shared-types";
import type { ListQuery } from "@repuchain/validation";
import { audit } from "../../audit/services/audit";
@Injectable()
export class CategoriesService {
  constructor(@Inject(DatabaseService) private readonly db: DatabaseService) {}
  async list(user: AuthenticatedUser, query: ListQuery) {
    const where = { companyId: user.companyId, ...(query.search ? { name: { contains: query.search, mode: "insensitive" as const } } : {}) };
    const [items,total] = await this.db.client.$transaction([this.db.client.category.findMany({ where, orderBy:{name:"asc"}, skip:(query.page-1)*query.limit,take:query.limit }), this.db.client.category.count({where})]);
    return {items,total,page:query.page,limit:query.limit};
  }
  create(user: AuthenticatedUser, name: string) {
    return this.db.client.$transaction(async tx => {
      const entity = await tx.category.create({ data: { companyId:user.companyId, name } });
      await audit(tx,user,"categories.create",entity.id);
      return entity;
    });
  }
}
