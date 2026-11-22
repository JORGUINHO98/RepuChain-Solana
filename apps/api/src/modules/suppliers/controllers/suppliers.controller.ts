import { Body, Controller, Get, Inject, Param, ParseUUIDPipe, Patch, Post, Query } from "@nestjs/common";
import type { AuthenticatedUser } from "@repuchain/shared-types";
import { supplierSchema, updateSupplierSchema, listQuerySchema, type SupplierInput, type UpdateSupplierInput, type ListQuery } from "@repuchain/validation";
import { CurrentUser, RequirePermission } from "../../../common/auth.decorators";
import { ZodPipe } from "../../../common/validation.pipe";
import { SuppliersService } from "../services/suppliers.service";
@Controller("suppliers")
export class SuppliersController {
  constructor(@Inject(SuppliersService) private readonly service: SuppliersService) {}
  @Get() @RequirePermission("suppliers:read") list(@CurrentUser() user: AuthenticatedUser, @Query(new ZodPipe(listQuerySchema)) query: ListQuery) { return this.service.list(user, query); }
  @Get(":id") @RequirePermission("suppliers:read") get(@CurrentUser() user: AuthenticatedUser, @Param("id", ParseUUIDPipe) id: string) { return this.service.get(user, id); }
  @Post() @RequirePermission("suppliers:write") create(@CurrentUser() user: AuthenticatedUser, @Body(new ZodPipe(supplierSchema)) input: SupplierInput) { return this.service.create(user, input); }
  @Patch(":id") @RequirePermission("suppliers:write") update(@CurrentUser() user: AuthenticatedUser, @Param("id", ParseUUIDPipe) id: string, @Body(new ZodPipe(updateSupplierSchema)) input: UpdateSupplierInput) { return this.service.update(user, id, input); }
}
