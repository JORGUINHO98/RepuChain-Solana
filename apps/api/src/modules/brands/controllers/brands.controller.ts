import { Body, Controller, Get, Inject, Post, Query } from "@nestjs/common";
import type { AuthenticatedUser } from "@repuchain/shared-types";
import { namedEntitySchema, listQuerySchema, type ListQuery } from "@repuchain/validation";
import { CurrentUser, RequirePermission } from "../../../common/auth.decorators";
import { ZodPipe } from "../../../common/validation.pipe";
import { BrandsService } from "../services/brands.service";
@Controller("brands")
export class BrandsController {
  constructor(@Inject(BrandsService) private readonly service: BrandsService) {}
  @Get() @RequirePermission("catalog:read") list(@CurrentUser() user: AuthenticatedUser, @Query(new ZodPipe(listQuerySchema)) query: ListQuery) { return this.service.list(user,query); }
  @Post() @RequirePermission("catalog:write") create(@CurrentUser() user: AuthenticatedUser, @Body(new ZodPipe(namedEntitySchema)) input:{name:string}) { return this.service.create(user,input.name); }
}
