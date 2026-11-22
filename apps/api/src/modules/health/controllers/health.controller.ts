import { Controller,Get,Inject } from "@nestjs/common";
import type { HealthResponse } from "@repuchain/shared-types";
import { Public } from "../../../common/auth.decorators";
import { HealthService } from "../services/health.service";
@Controller("health") @Public()
export class HealthController {
  constructor(@Inject(HealthService) private readonly health:HealthService) {}
  @Get() getHealth():HealthResponse {return this.health.getLiveness();}
  @Get("ready") ready(){return this.health.getReadiness();}
}
