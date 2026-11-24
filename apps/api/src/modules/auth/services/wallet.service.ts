import {Inject,Injectable,UnauthorizedException,BadRequestException} from "@nestjs/common";
import {createPublicKey,verify,randomUUID,randomBytes} from "node:crypto";
import {getAddressEncoder,address as solanaAddress} from "@solana/kit";
import {DEFAULT_ROLES,PERMISSIONS} from "@repuchain/shared-types";
import {hashPassword,createRefreshToken,sha256} from "@repuchain/security";
import {DatabaseService} from "../../../database/database.service";
import {AuthService} from "./auth.service";
import {serializable} from "../../../common/transaction";
import {audit} from "../../audit/services/audit";
@Injectable()
export class WalletService{
 constructor(@Inject(DatabaseService) private db:DatabaseService,@Inject(AuthService) private auth:AuthService){}
 private key(value:string){try{return Buffer.from(getAddressEncoder().encode(solanaAddress(value)));}catch{throw new BadRequestException("Dirección Solana inválida");}}
 private origin(value:string){
  const configured=(process.env.WALLET_AUTH_ORIGINS??process.env.WEB_ORIGIN??"http://localhost:3000").split(",").map(v=>v.trim());
  let url:URL;
  try{url=new URL(value);}catch{throw new BadRequestException("Origen de acceso no permitido");}
  const localDevelopment=process.env.NODE_ENV!=="production"
   &&url.protocol==="http:"
   &&url.origin===value
   &&["localhost","127.0.0.1","[::1]"].includes(url.hostname);
  if(!configured.includes(value)&&!localDevelopment)throw new BadRequestException("Origen de acceso no permitido");
  return url;
 }
 async challenge(address:string,origin:string){
  this.key(address);const url=this.origin(origin);const id=randomUUID(),now=new Date(),expires=new Date(now.getTime()+300000);
  const message=url.host+" wants you to sign in with your Solana account:\n"+address+"\n\nIniciar sesión en RepuChain. No autoriza transacciones ni movimientos de fondos.\n\nURI: "+origin+"\nVersion: 1\nChain ID: solana:devnet\nNonce: "+randomBytes(24).toString("hex")+"\nIssued At: "+now.toISOString()+"\nExpiration Time: "+expires.toISOString()+"\nRequest ID: "+id;
  await this.db.client.walletChallenge.create({data:{id,address,origin,message,expiresAt:expires}});
  return {id,address,message,expiresAt:expires.toISOString()};
 }
 async authenticate(id:string,signature:string,origin:string){
  this.origin(origin);
  const row=await this.db.client.walletChallenge.findUnique({where:{id}});
  if(!row||row.origin!==origin||row.usedAt||row.expiresAt<=new Date())throw new UnauthorizedException("La solicitud de firma expiró o ya fue utilizada");
  const signatureBytes=Buffer.from(signature,"base64");
  const publicKey=createPublicKey({key:Buffer.concat([Buffer.from("302a300506032b6570032100","hex"),this.key(row.address)]),format:"der",type:"spki"});
  if(signatureBytes.length!==64||!verify(null,Buffer.from(row.message),publicKey,signatureBytes))throw new UnauthorizedException("Firma inválida");
  // Unknown wallets receive their own tenant, never membership of an existing one.
  const unreachablePassword=await hashPassword(randomBytes(48).toString("hex"));
  const refreshToken=createRefreshToken();
  const result=await serializable(this.db.client,async tx=>{
   const used=await tx.walletChallenge.updateMany({where:{id,usedAt:null,expiresAt:{gt:new Date()}},data:{usedAt:new Date()}});
   if(used.count!==1)throw new UnauthorizedException("Solicitud de firma ya utilizada");
   await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${row.address}))`;
   let identity=await tx.walletIdentity.findUnique({where:{address:row.address},include:{user:true}});
   if(!identity){
    const company=await tx.company.create({data:{slug:"wallet-"+randomUUID(),name:"Espacio "+row.address.slice(0,6)}});
    await tx.permission.createMany({data:PERMISSIONS.map(code=>({code,description:code})),skipDuplicates:true});
    let roleId="";
    for(const [name,permissions] of Object.entries(DEFAULT_ROLES)){
     const role=await tx.role.create({data:{companyId:company.id,name}});
     await tx.rolePermission.createMany({data:permissions.map(permissionCode=>({roleId:role.id,permissionCode}))});
     if(name==="ADMIN")roleId=role.id;
    }
    const user=await tx.user.create({data:{companyId:company.id,roleId,name:"Wallet "+row.address.slice(0,6),email:randomUUID()+"@wallet.invalid",passwordHash:unreachablePassword}});
    identity=await tx.walletIdentity.create({data:{address:row.address,userId:user.id},include:{user:true}});
    await audit(tx,user,"auth.wallet_register",user.id);
   }
   if(!identity.user.active)throw new UnauthorizedException("Acceso desactivado");
   const session=await tx.session.create({data:{userId:identity.userId,companyId:identity.user.companyId,expiresAt:new Date(Date.now()+7*86400000),tokens:{create:{tokenHash:sha256(refreshToken),expiresAt:new Date(Date.now()+7*86400000)}}}});
   await audit(tx,identity.user,"auth.wallet_login",session.id);
   return {user:identity.user,session};
  });
  return this.auth.tokens(result.user.id,result.user.companyId,result.session.id,refreshToken);
 }
}
