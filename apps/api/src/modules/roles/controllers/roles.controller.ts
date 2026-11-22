import { Controller,Get,Inject } from "@nestjs/common";
import type { AuthenticatedUser } from "@repuchain/shared-types";
import { CurrentUser,RequirePermission } from "../../../common/auth.decorators";
import { RolesService } from "../services/roles.service";
@Controller("roles") @RequirePermission("users:manage")
export class RolesController {
  constructor(@Inject(RolesService) private readonly service:RolesService) {}
  @Get() get(@CurrentUser() user:AuthenticatedUser){return this.service.get(user);}
}
