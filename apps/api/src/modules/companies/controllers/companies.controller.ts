import { Controller,Get,Inject } from "@nestjs/common";
import type { AuthenticatedUser } from "@repuchain/shared-types";
import { CurrentUser,RequirePermission } from "../../../common/auth.decorators";
import { CompaniesService } from "../services/companies.service";
@Controller("companies/me") 
export class CompaniesController {
  constructor(@Inject(CompaniesService) private readonly service:CompaniesService) {}
  @Get() get(@CurrentUser() user:AuthenticatedUser){return this.service.get(user);}
}
