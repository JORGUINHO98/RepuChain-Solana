import {Body,Controller,Header,Inject,Post} from "@nestjs/common";
import {Throttle} from "@nestjs/throttler";
import {z} from "zod";
import {Public} from "../../../common/auth.decorators";
import {ZodPipe} from "../../../common/validation.pipe";
import {WalletService} from "../services/wallet.service";
const challenge=z.object({address:z.string().min(32).max(44),origin:z.url().max(255)}).strict();
const proof=z.object({id:z.uuid(),signature:z.string().regex(/^[A-Za-z0-9+/]{86}==$/),origin:z.url().max(255)}).strict();
@Controller("auth/wallet")
export class WalletController{
 constructor(@Inject(WalletService) private wallet:WalletService){}
 @Public() @Post("challenge") @Header("Cache-Control","no-store") @Throttle({default:{limit:15,ttl:60000}})
 challenge(@Body(new ZodPipe(challenge)) input:z.infer<typeof challenge>){return this.wallet.challenge(input.address,input.origin);}
 @Public() @Post("verify") @Header("Cache-Control","no-store") @Throttle({default:{limit:15,ttl:60000}})
 verify(@Body(new ZodPipe(proof)) input:z.infer<typeof proof>){return this.wallet.authenticate(input.id,input.signature,input.origin);}
}
