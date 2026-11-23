import {beforeAll,afterAll,it,expect} from "vitest";
import {generateKeyPairSync,sign} from "node:crypto";
import {getAddressDecoder} from "../../apps/api/node_modules/@solana/kit";
import {setup,teardown,request,db} from "./helpers";
beforeAll(setup);afterAll(teardown);
const pair=generateKeyPairSync("ed25519");
const address=getAddressDecoder().decode(pair.publicKey.export({format:"der",type:"spki"}).subarray(-32));
const origin="http://127.0.0.1:3000";
let id:string,message:string,companyId:string;
const signature=()=>sign(null,Buffer.from(message),pair.privateKey).toString("base64");
it("emite un reto ligado a origen, wallet y caducidad",async()=>{
 const r=await request("POST","/auth/wallet/challenge",{address,origin},"");expect(r.status).toBe(201);id=r.body.id;message=r.body.message;expect(message).toContain(address);expect(message).toContain(origin);
});
it("rechaza una firma ajena sin consumir el reto",async()=>{
 const other=generateKeyPairSync("ed25519");
 expect((await request("POST","/auth/wallet/verify",{id,origin,signature:sign(null,Buffer.from(message),other.privateKey).toString("base64")},"")).status).toBe(401);
 expect((await db.walletChallenge.findUniqueOrThrow({where:{id}})).usedAt).toBeNull();
});
it("crea espacio propio y sesión al verificar la firma",async()=>{
 const r=await request("POST","/auth/wallet/verify",{id,origin,signature:signature()},"");expect(r.status).toBe(201);
 const me=await request("GET","/auth/me",undefined,r.body.accessToken);expect(me.status).toBe(200);expect(me.body.role).toBe("ADMIN");companyId=me.body.companyId;
});
it("impide reutilizar una firma",async()=>{
 expect((await request("POST","/auth/wallet/verify",{id,origin,signature:signature()},"")).status).toBe(401);
});
it("recupera el mismo espacio con un reto nuevo",async()=>{
 const r=await request("POST","/auth/wallet/challenge",{address,origin},"");id=r.body.id;message=r.body.message;
 const login=await request("POST","/auth/wallet/verify",{id,origin,signature:signature()},"");expect(login.status).toBe(201);
 expect((await request("GET","/auth/me",undefined,login.body.accessToken)).body.companyId).toBe(companyId);
 expect(await db.walletIdentity.count({where:{address}})).toBe(1);
});
it("rechaza origen diferente y reto caducado",async()=>{
 expect((await request("POST","/auth/wallet/challenge",{address,origin:"https://evil.invalid"},"")).status).toBe(400);
 const r=await request("POST","/auth/wallet/challenge",{address,origin},"");id=r.body.id;message=r.body.message;
 expect((await request("POST","/auth/wallet/verify",{id,origin:"http://localhost:3000",signature:signature()},"")).status).toBe(401);
 await db.walletChallenge.update({where:{id},data:{expiresAt:new Date(0)}});
 expect((await request("POST","/auth/wallet/verify",{id,origin,signature:signature()},"")).status).toBe(401);
});
it("mantiene una sola empresa ante dos primeros accesos simultáneos",async()=>{
 const keys=generateKeyPairSync("ed25519");
 const wallet=getAddressDecoder().decode(keys.publicKey.export({format:"der",type:"spki"}).subarray(-32));
 const challenges=await Promise.all([0,1].map(()=>request("POST","/auth/wallet/challenge",{address:wallet,origin},"")));
 const results=await Promise.all(challenges.map(c=>request("POST","/auth/wallet/verify",{id:c.body.id,origin,signature:sign(null,Buffer.from(c.body.message),keys.privateKey).toString("base64")},"")));
 expect(results.map(r=>r.status)).toEqual([201,201]);
 const users=await Promise.all(results.map(r=>request("GET","/auth/me",undefined,r.body.accessToken)));
 expect(users[0].body.companyId).toBe(users[1].body.companyId);
 expect(await db.walletIdentity.count({where:{address:wallet}})).toBe(1);
});