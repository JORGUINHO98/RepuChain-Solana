import { Controller,Get,Post,Param,Query,Inject,NotFoundException,ConflictException,ParseUUIDPipe } from "@nestjs/common";
import { DatabaseService } from "../../database/database.service";
import { CurrentUser,RequirePermission } from "../../common/auth.decorators";
import { ZodPipe } from "../../common/validation.pipe";
import { inventoryQuerySchema,type InventoryQuery } from "@repuchain/validation";
import type { AuthenticatedUser } from "@repuchain/shared-types";
import { audit } from "../audit/services/audit";
const select={batch:{select:{code:true,product:{select:{name:true}}}},id:true,batchId:true,eventId:true,sequence:true,payloadHash:true,status:true,attempts:true,
  availableAt:true,lastError:true,signature:true,account:true,evidenceHash:true,confirmedAt:true,createdAt:true} as const;
@Controller("blockchain/evidence")
export class BlockchainController {
  constructor(@Inject(DatabaseService) private readonly db:DatabaseService){}
  @Get() @RequirePermission("inventory:read")
  async list(@CurrentUser() actor:AuthenticatedUser,@Query(new ZodPipe(inventoryQuerySchema)) query:InventoryQuery){
    const where={companyId:actor.companyId,batchId:query.batchId};
    const [items,total]=await this.db.client.$transaction([
      this.db.client.evidenceOutbox.findMany({where,select,orderBy:[{createdAt:"desc"},{sequence:"asc"}],skip:(query.page-1)*query.limit,take:query.limit}),
      this.db.client.evidenceOutbox.count({where}),
    ]);
    return {items,total,page:query.page,limit:query.limit};
  }
  @Get(":id") @RequirePermission("inventory:read")
  async detail(@CurrentUser() actor:AuthenticatedUser,@Param("id",new ParseUUIDPipe()) id:string){
    const result=await this.db.client.evidenceOutbox.findFirst({where:{id,companyId:actor.companyId},select:{...select,canonicalPayload:true}});
    if(!result)throw new NotFoundException("Evidencia no encontrada");
    const binding=await this.db.client.blockchainBinding.findUnique({where:{companyId:actor.companyId},select:{network:true,programId:true,authority:true}});
    return {...result,blockchain:binding};
  }
  @Post(":id/retry") @RequirePermission("users:manage")
  async retry(@CurrentUser() actor:AuthenticatedUser,@Param("id",new ParseUUIDPipe()) id:string){
    return this.db.client.$transaction(async tx=>{
      const row=await tx.evidenceOutbox.findFirst({where:{id,companyId:actor.companyId}});
      if(!row)throw new NotFoundException("Evidencia no encontrada");
      const result=await tx.evidenceOutbox.updateMany({where:{id,companyId:actor.companyId,status:"FAILED"},data:{status:"PENDING",attempts:0,availableAt:new Date(),lastError:null}});
      if(!result.count)throw new ConflictException("Solo se pueden reintentar evidencias fallidas");
      await audit(tx,actor,"blockchain.retry",id);
      return {id,status:"PENDING"};
    });
  }
}
