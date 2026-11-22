import { Inject,Injectable } from "@nestjs/common";
import { DatabaseService } from "../../../database/database.service";
import type { AuthenticatedUser } from "@repuchain/shared-types";
import type { ListQuery } from "@repuchain/validation";
@Injectable()
export class AuditService {
  constructor(@Inject(DatabaseService) private readonly db:DatabaseService) {}
  async list(user:AuthenticatedUser,query:ListQuery){
    const where={companyId:user.companyId,...(query.search?{action:{contains:query.search,mode:"insensitive" as const}}:{})};
    const [items,total]=await this.db.client.$transaction([this.db.client.auditLog.findMany({where,orderBy:[{createdAt:"desc"},{id:"desc"}],skip:(query.page-1)*query.limit,take:query.limit}),this.db.client.auditLog.count({where})]);
    return {items,total,page:query.page,limit:query.limit};
  }
}
