import { Controller,Get,Inject,Query } from "@nestjs/common";
import type { AuthenticatedUser } from "@repuchain/shared-types";
import { listQuerySchema,type ListQuery } from "@repuchain/validation";
import { CurrentUser,RequirePermission } from "../../../common/auth.decorators";
import { ZodPipe } from "../../../common/validation.pipe";
import { AuditService } from "../services/audit.service";
@Controller("audit") @RequirePermission("audit:read")
export class AuditController {
  constructor(@Inject(AuditService) private readonly service:AuditService) {}
  @Get() list(@CurrentUser() user:AuthenticatedUser,@Query(new ZodPipe(listQuerySchema)) query:ListQuery){return this.service.list(user,query);}
}
