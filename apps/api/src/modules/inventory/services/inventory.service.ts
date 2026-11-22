import { Inject, Injectable } from "@nestjs/common";
import { DatabaseService } from "../../../database/database.service";
import type { AuthenticatedUser } from "@repuchain/shared-types";
import type { InventoryQuery } from "@repuchain/validation";
@Injectable()
export class InventoryService {
  constructor(@Inject(DatabaseService) private readonly db:DatabaseService) {}
  async list(user:AuthenticatedUser,query:InventoryQuery) {
    const where = { companyId:user.companyId, warehouseId:query.warehouseId, batchId:query.batchId,
      ...(query.search ? { batch: { product: { name:{contains:query.search,mode:"insensitive" as const} } } } : {}) };
    const [items,total]=await this.db.client.$transaction([
      this.db.client.stock.findMany({where,include:{batch:{include:{product:true}},warehouse:true},orderBy:[{warehouseId:"asc"},{batchId:"asc"}],skip:(query.page-1)*query.limit,take:query.limit}),
      this.db.client.stock.count({where}),
    ]);
    return {items,total,page:query.page,limit:query.limit};
  }
}
