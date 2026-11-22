import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { DatabaseService } from "../../../database/database.service";
import type { AuthenticatedUser } from "@repuchain/shared-types";
import type { ListQuery,VehicleInput } from "@repuchain/validation";
import { audit } from "../../audit/services/audit";
@Injectable()
export class VehiclesService {
  constructor(@Inject(DatabaseService) private readonly db:DatabaseService) {}
  async list(actor:AuthenticatedUser,query:ListQuery) {
    const where={companyId:actor.companyId,...(query.search?{model:{contains:query.search,mode:"insensitive" as const}}:{})};
    const [items,total]=await this.db.client.$transaction([this.db.client.vehicleModel.findMany({where,orderBy:[{make:"asc"},{model:"asc"}],skip:(query.page-1)*query.limit,take:query.limit}),this.db.client.vehicleModel.count({where})]);
    return {items,total,page:query.page,limit:query.limit};
  }
  create(actor:AuthenticatedUser,input:VehicleInput) {
    return this.db.client.$transaction(async tx=>{
      const entity=await tx.vehicleModel.create({data:{...input,companyId:actor.companyId}});
      await audit(tx,actor,"vehicles.create",entity.id);
      return entity;
    });
  }
  async compatibilities(actor:AuthenticatedUser,productId:string) {
    if(!await this.db.client.product.findFirst({where:{id:productId,companyId:actor.companyId}})) throw new NotFoundException("Producto no encontrado");
    return this.db.client.productCompatibility.findMany({where:{companyId:actor.companyId,productId},include:{vehicle:true},take:100});
  }
  link(actor:AuthenticatedUser,productId:string,vehicleModelId:string) {
    return this.db.client.$transaction(async tx=>{
      if(!await tx.product.findFirst({where:{id:productId,companyId:actor.companyId}})) throw new NotFoundException("Producto no encontrado");
      if(!await tx.vehicleModel.findFirst({where:{id:vehicleModelId,companyId:actor.companyId}})) throw new NotFoundException("Vehículo no encontrado");
      const result=await tx.productCompatibility.upsert({where:{companyId_productId_vehicleModelId:{companyId:actor.companyId,productId,vehicleModelId}},create:{companyId:actor.companyId,productId,vehicleModelId},update:{}});
      await audit(tx,actor,"products.compatibility",productId,{vehicleModelId});
      return result;
    });
  }
}
