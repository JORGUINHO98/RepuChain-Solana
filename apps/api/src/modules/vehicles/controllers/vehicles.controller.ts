import { Body,Controller,Get,Inject,Param,ParseUUIDPipe,Post,Query } from "@nestjs/common";
import type { AuthenticatedUser } from "@repuchain/shared-types";
import { vehicleSchema,compatibilitySchema,listQuerySchema,type VehicleInput,type ListQuery } from "@repuchain/validation";
import { CurrentUser,RequirePermission } from "../../../common/auth.decorators";
import { ZodPipe } from "../../../common/validation.pipe";
import { VehiclesService } from "../services/vehicles.service";
@Controller()
export class VehiclesController {
  constructor(@Inject(VehiclesService) private readonly service:VehiclesService) {}
  @Get("vehicles") @RequirePermission("catalog:read") list(@CurrentUser() user:AuthenticatedUser,@Query(new ZodPipe(listQuerySchema)) query:ListQuery){return this.service.list(user,query);}
  @Post("vehicles") @RequirePermission("catalog:write") create(@CurrentUser() user:AuthenticatedUser,@Body(new ZodPipe(vehicleSchema)) input:VehicleInput){return this.service.create(user,input);}
  @Get("products/:id/compatibilities") @RequirePermission("catalog:read") compatibilities(@CurrentUser() user:AuthenticatedUser,@Param("id",ParseUUIDPipe) id:string){return this.service.compatibilities(user,id);}
  @Post("products/:id/compatibilities") @RequirePermission("catalog:write") link(@CurrentUser() user:AuthenticatedUser,@Param("id",ParseUUIDPipe) id:string,@Body(new ZodPipe(compatibilitySchema)) input:{vehicleModelId:string}){return this.service.link(user,id,input.vehicleModelId);}
}
