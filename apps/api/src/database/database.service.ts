import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { createDatabase } from "@repuchain/database";
import { environment } from "../config/environment";
@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  readonly client = createDatabase(environment.DATABASE_URL);
  async onModuleInit() { await this.client.$connect(); }
  async onModuleDestroy() { await this.client.$disconnect(); }
}
