import {Controller,Get,Post,Body,Query,Inject} from "@nestjs/common";
import {CurrentUser,RequirePermission,IdempotencyKey} from "../../common/auth.decorators";
import {ZodPipe} from "../../common/validation.pipe";
import {purchaseSchema,saleSchema,listQuerySchema,type TradeInput,type ListQuery} from "@repuchain/validation";
import type {AuthenticatedUser} from "@repuchain/shared-types";
import {TradeService} from "./service";
@Controller()
export class TradeController {
  constructor(@Inject(TradeService) private readonly service:TradeService){}
  @Get("purchases") @RequirePermission("purchases:read")
  purchases(@CurrentUser() user:AuthenticatedUser,@Query(new ZodPipe(listQuerySchema)) q:ListQuery){return this.service.list(user,"PURCHASE",q);}
  @Get("sales") @RequirePermission("sales:read")
  sales(@CurrentUser() user:AuthenticatedUser,@Query(new ZodPipe(listQuerySchema)) q:ListQuery){return this.service.list(user,"SALE",q);}
  @Post("purchases") @RequirePermission("purchases:write")
  purchase(@CurrentUser() user:AuthenticatedUser,@Body(new ZodPipe(purchaseSchema)) body:TradeInput,@IdempotencyKey() key:string){return this.service.create(user,"PURCHASE",body,key);}
  @Post("sales") @RequirePermission("sales:write")
  sale(@CurrentUser() user:AuthenticatedUser,@Body(new ZodPipe(saleSchema)) body:TradeInput,@IdempotencyKey() key:string){return this.service.create(user,"SALE",body,key);}
}
