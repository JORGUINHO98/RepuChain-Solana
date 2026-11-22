import { Body,Controller,Get,Headers,Inject,Post,Query,ParseUUIDPipe } from "@nestjs/common";
import type { AuthenticatedUser } from "@repuchain/shared-types";
import { movementSchema,inventoryQuerySchema,type MovementInput,type InventoryQuery } from "@repuchain/validation";
import { CurrentUser,RequirePermission,IdempotencyKey } from "../../../common/auth.decorators";
import { ZodPipe } from "../../../common/validation.pipe";
import { MovementsService } from "../services/movements.service";
@Controller("movements")
export class MovementsController {
  constructor(@Inject(MovementsService) private readonly service:MovementsService) {}
  @Get() @RequirePermission("inventory:read") list(@CurrentUser() user:AuthenticatedUser,@Query(new ZodPipe(inventoryQuerySchema)) query:InventoryQuery){return this.service.list(user,query);}
  @Post() @RequirePermission("inventory:write") create(@CurrentUser() user:AuthenticatedUser,@Body(new ZodPipe(movementSchema)) input:MovementInput,@IdempotencyKey() key:string){return this.service.create(user,input,key);}
}
