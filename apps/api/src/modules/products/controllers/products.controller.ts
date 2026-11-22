import { Body, Controller, Get, Inject, Param, ParseUUIDPipe, Patch, Post, Query } from "@nestjs/common";
import type { AuthenticatedUser } from "@repuchain/shared-types";
import { productSchema, updateProductSchema, listQuerySchema, type ProductInput, type UpdateProductInput, type ListQuery } from "@repuchain/validation";
import { CurrentUser, RequirePermission } from "../../../common/auth.decorators";
import { ZodPipe } from "../../../common/validation.pipe";
import { ProductsService } from "../services/products.service";
@Controller("products")
export class ProductsController {
  constructor(@Inject(ProductsService) private readonly service: ProductsService) {}
  @Get() @RequirePermission("catalog:read") list(@CurrentUser() user: AuthenticatedUser, @Query(new ZodPipe(listQuerySchema)) query: ListQuery) { return this.service.list(user, query); }
  @Get(":id") @RequirePermission("catalog:read") get(@CurrentUser() user: AuthenticatedUser, @Param("id", ParseUUIDPipe) id: string) { return this.service.get(user, id); }
  @Post() @RequirePermission("catalog:write") create(@CurrentUser() user: AuthenticatedUser, @Body(new ZodPipe(productSchema)) input: ProductInput) { return this.service.create(user, input); }
  @Patch(":id") @RequirePermission("catalog:write") update(@CurrentUser() user: AuthenticatedUser, @Param("id", ParseUUIDPipe) id: string, @Body(new ZodPipe(updateProductSchema)) input: UpdateProductInput) { return this.service.update(user, id, input); }
}
