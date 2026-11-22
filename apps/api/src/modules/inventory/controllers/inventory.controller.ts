import { Controller, Get, Inject, Query } from "@nestjs/common";
import type { AuthenticatedUser } from "@repuchain/shared-types";
import { inventoryQuerySchema,type InventoryQuery } from "@repuchain/validation";
import { CurrentUser,RequirePermission } from "../../../common/auth.decorators";
import { ZodPipe } from "../../../common/validation.pipe";
import { InventoryService } from "../services/inventory.service";
@Controller("inventory") @RequirePermission("inventory:read")
export class InventoryController {
  constructor(@Inject(InventoryService) private readonly service:InventoryService) {}
  @Get() list(@CurrentUser() user:AuthenticatedUser,@Query(new ZodPipe(inventoryQuerySchema)) query:InventoryQuery) { return this.service.list(user,query); }
}
