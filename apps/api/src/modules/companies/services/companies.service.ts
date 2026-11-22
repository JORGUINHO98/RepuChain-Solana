import { Inject,Injectable } from "@nestjs/common";
import { DatabaseService } from "../../../database/database.service";
import type { AuthenticatedUser } from "@repuchain/shared-types";
@Injectable()
export class CompaniesService {
  constructor(@Inject(DatabaseService) private readonly db:DatabaseService) {}
  get(user:AuthenticatedUser){return this.db.client.company.findUniqueOrThrow({where:{id:user.companyId},select:{id:true,slug:true,name:true,currency:true}});}
}
