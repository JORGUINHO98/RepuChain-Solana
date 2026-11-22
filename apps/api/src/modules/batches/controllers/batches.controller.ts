import { Body, Controller, Get, Inject, Post, Query, Param, ParseUUIDPipe } from "@nestjs/common";
import type { AuthenticatedUser } from "@repuchain/shared-types";
import { batchSchema, listQuerySchema, type BatchInput, type ListQuery } from "@repuchain/validation";
import { CurrentUser, RequirePermission } from "../../../common/auth.decorators";
import { ZodPipe } from "../../../common/validation.pipe";
import { BatchesService } from "../services/batches.service";
@Controller("batches")
export class BatchesController {
  constructor(@Inject(BatchesService) private readonly service:BatchesService) {}
  @Get() @RequirePermission("inventory:read") list(@CurrentUser() user:AuthenticatedUser,@Query(new ZodPipe(listQuerySchema)) query:ListQuery) { return this.service.list(user,query); }
  @Get(":id/qr") @RequirePermission("inventory:read") qr(@CurrentUser() user:AuthenticatedUser,@Param("id",new ParseUUIDPipe()) id:string) { return this.service.qr(user,id); }
  @Get(":id") @RequirePermission("inventory:read") get(@CurrentUser() user:AuthenticatedUser,@Param("id",new ParseUUIDPipe()) id:string) { return this.service.get(user,id); }
  @Post() @RequirePermission("inventory:write") create(@CurrentUser() user:AuthenticatedUser,@Body(new ZodPipe(batchSchema)) input:BatchInput) { return this.service.create(user,input); }
}
