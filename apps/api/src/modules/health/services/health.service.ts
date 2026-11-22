import { Inject,Injectable,ServiceUnavailableException } from "@nestjs/common";
import type { HealthResponse } from "@repuchain/shared-types";
import { DatabaseService } from "../../../database/database.service";
@Injectable()
export class HealthService {
  constructor(@Inject(DatabaseService) private readonly db:DatabaseService) {}
  getLiveness():HealthResponse {return {status:"ok",service:"repuchain-api",version:"0.2.0"};}
  async getReadiness(){
    try {await this.db.client.$queryRaw`SELECT 1`;return {status:"ok",database:"available"};}
    catch {throw new ServiceUnavailableException("Base de datos no disponible");}
  }
}
