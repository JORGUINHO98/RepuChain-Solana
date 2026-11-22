import {Module,Controller,Get,Inject} from "@nestjs/common";
import {DatabaseService} from "../../database/database.service";
import {CurrentUser,RequirePermission} from "../../common/auth.decorators";
import type {AuthenticatedUser} from "@repuchain/shared-types";
@Controller("dashboard")
class DashboardController{
  constructor(@Inject(DatabaseService) private readonly db:DatabaseService){}
  @Get() @RequirePermission("inventory:read")
  async summary(@CurrentUser() user:AuthenticatedUser){
    const companyId=user.companyId;
    const since=new Date();since.setUTCHours(0,0,0,0);since.setUTCDate(since.getUTCDate()-6);
    return this.db.client.$transaction(async tx=>{
      const [products,batches,stock,evidence,recent,days,warehouses,low]=await Promise.all([
        tx.product.count({where:{companyId,active:true}}),
        tx.inventoryBatch.count({where:{companyId}}),
        tx.stock.aggregate({where:{companyId},_sum:{quantity:true}}),
        tx.evidenceOutbox.groupBy({by:["status"],where:{companyId},_count:true}),
        tx.inventoryMovement.findMany({where:{companyId},take:6,orderBy:[{createdAt:"desc"},{id:"desc"}],include:{batch:{include:{product:true}},source:true,destination:true}}),
        tx.$queryRaw<{day:string;type:string;quantity:bigint}[]>`SELECT "createdAt"::date::text AS day,type::text,SUM(quantity)::bigint AS quantity FROM inventory_movements WHERE "companyId"=${companyId}::uuid AND "createdAt">=${since} GROUP BY 1,2 ORDER BY 1`,
        tx.$queryRaw<{id:string;name:string;quantity:bigint}[]>`SELECT w.id,w.name,COALESCE(SUM(s.quantity),0)::bigint AS quantity FROM warehouses w LEFT JOIN stock s ON s."warehouseId"=w.id AND s."companyId"=w."companyId" WHERE w."companyId"=${companyId}::uuid GROUP BY w.id ORDER BY quantity DESC,w.name LIMIT 8`,
        tx.$queryRaw<{id:string;sku:string;name:string;minimumStock:number;quantity:bigint}[]>`SELECT p.id,p.sku,p.name,p."minimumStock",COALESCE(SUM(s.quantity),0)::bigint AS quantity FROM products p LEFT JOIN inventory_batches b ON b."productId"=p.id AND b."companyId"=p."companyId" LEFT JOIN stock s ON s."batchId"=b.id AND s."companyId"=p."companyId" WHERE p."companyId"=${companyId}::uuid AND p.active=true GROUP BY p.id HAVING COALESCE(SUM(s.quantity),0)<p."minimumStock" ORDER BY p.name LIMIT 8`,
      ]);
      return {products,batches,units:stock._sum.quantity??0,evidence,recent,
        days:Array.from({length:7},(_,i)=>{const date=new Date(since);date.setUTCDate(date.getUTCDate()+i);const day=date.toISOString().slice(0,10);return {day,in:Number(days.find(r=>r.day===day&&r.type==="IN")?.quantity??0),out:Number(days.find(r=>r.day===day&&r.type==="OUT")?.quantity??0)};}),
        warehouses:warehouses.map(v=>({...v,quantity:Number(v.quantity)})),lowStock:low.map(v=>({...v,quantity:Number(v.quantity)})),
        generatedAt:new Date().toISOString()};
    },{isolationLevel:"RepeatableRead",timeout:10000});
  }
}
@Module({controllers:[DashboardController]})
export class DashboardModule{}
