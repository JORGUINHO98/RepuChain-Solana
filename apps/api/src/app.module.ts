import { TradeModule } from "./modules/trade/module";
import { DashboardModule } from "./modules/dashboard/module";
import { BlockchainModule } from "./modules/blockchain/module";
import { Module } from "@nestjs/common";
import { APP_GUARD,APP_FILTER } from "@nestjs/core";
import { ThrottlerModule,ThrottlerGuard } from "@nestjs/throttler";
import { DatabaseModule } from "./database/module";
import { DatabaseErrorsFilter } from "./common/database-errors.filter";
import { AccessGuard } from "./modules/auth/guards/access.guard";
import { HealthModule } from "./modules/health/module";
import { AuthModule } from "./modules/auth/module";
import { UsersModule } from "./modules/users/module";
import { RolesModule } from "./modules/roles/module";
import { CompaniesModule } from "./modules/companies/module";
import { ProductsModule } from "./modules/products/module";
import { CategoriesModule } from "./modules/categories/module";
import { BrandsModule } from "./modules/brands/module";
import { VehiclesModule } from "./modules/vehicles/module";
import { SuppliersModule } from "./modules/suppliers/module";
import { WarehousesModule } from "./modules/warehouses/module";
import { BatchesModule } from "./modules/batches/module";
import { InventoryModule } from "./modules/inventory/module";
import { MovementsModule } from "./modules/movements/module";
import { AuditModule } from "./modules/audit/module";
@Module({
  imports:[TradeModule,DashboardModule,BlockchainModule,DatabaseModule,ThrottlerModule.forRoot([{ttl:60000,limit:120}]),HealthModule,AuthModule,UsersModule,RolesModule,CompaniesModule,ProductsModule,CategoriesModule,BrandsModule,VehiclesModule,SuppliersModule,WarehousesModule,BatchesModule,InventoryModule,MovementsModule,AuditModule],
  providers:[{provide:APP_GUARD,useClass:ThrottlerGuard},{provide:APP_GUARD,useClass:AccessGuard},{provide:APP_FILTER,useClass:DatabaseErrorsFilter}],
})
export class AppModule {}
