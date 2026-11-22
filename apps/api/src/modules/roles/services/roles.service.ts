import { Inject,Injectable } from "@nestjs/common";
import { DatabaseService } from "../../../database/database.service";
import type { AuthenticatedUser } from "@repuchain/shared-types";
@Injectable()
export class RolesService {
  constructor(@Inject(DatabaseService) private readonly db:DatabaseService) {}
  get(user:AuthenticatedUser){return this.db.client.role.findMany({where:{companyId:user.companyId},include:{permissions:{select:{permissionCode:true}}},orderBy:{name:"asc"}});}
}
