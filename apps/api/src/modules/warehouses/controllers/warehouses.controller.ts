import { Body, Controller, Get, Inject, Param, ParseUUIDPipe, Patch, Post, Query } from "@nestjs/common";
import type { AuthenticatedUser } from "@repuchain/shared-types";
import { warehouseSchema, updateWarehouseSchema, listQuerySchema, type WarehouseInput, type UpdateWarehouseInput, type ListQuery } from "@repuchain/validation";
import { CurrentUser, RequirePermission } from "../../../common/auth.decorators";
import { ZodPipe } from "../../../common/validation.pipe";
import { WarehousesService } from "../services/warehouses.service";
@Controller("warehouses")
export class WarehousesController {
  constructor(@Inject(WarehousesService) private readonly service: WarehousesService) {}
  @Get() @RequirePermission("warehouses:read") list(@CurrentUser() user: AuthenticatedUser, @Query(new ZodPipe(listQuerySchema)) query: ListQuery) { return this.service.list(user, query); }
  @Get(":id") @RequirePermission("warehouses:read") get(@CurrentUser() user: AuthenticatedUser, @Param("id", ParseUUIDPipe) id: string) { return this.service.get(user, id); }
  @Post() @RequirePermission("warehouses:write") create(@CurrentUser() user: AuthenticatedUser, @Body(new ZodPipe(warehouseSchema)) input: WarehouseInput) { return this.service.create(user, input); }
  @Patch(":id") @RequirePermission("warehouses:write") update(@CurrentUser() user: AuthenticatedUser, @Param("id", ParseUUIDPipe) id: string, @Body(new ZodPipe(updateWarehouseSchema)) input: UpdateWarehouseInput) { return this.service.update(user, id, input); }
}
