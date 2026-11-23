import assert from "node:assert/strict";
import {generateKeyPairSync,sign} from "node:crypto";
import {getAddressDecoder} from "../apps/api/node_modules/@solana/kit/dist/index.node.mjs";
const origin=process.env.WEB_URL??"http://127.0.0.1:3000";
const call=(path,options={})=>fetch(origin+path,{...options,headers:{"Content-Type":"application/json",Origin:origin,...options.headers}});
assert.equal((await call("/api/session")).status,401);
assert.equal((await call("/api/backend/dashboard")).status,401);
assert.equal((await call("/api/session",{method:"POST",body:"{}"})).status,403);
const pair=generateKeyPairSync("ed25519");
const address=getAddressDecoder().decode(pair.publicKey.export({format:"der",type:"spki"}).subarray(-32));
assert.equal((await call("/api/wallet/challenge",{method:"POST",headers:{Origin:"https://foreign.invalid"},body:JSON.stringify({address})})).status,403);
const challenge=await call("/api/wallet/challenge",{method:"POST",body:JSON.stringify({address})});
assert.equal(challenge.status,200);
const challengeCookie=challenge.headers.get("set-cookie").split(";")[0],data=await challenge.json();
const proof=JSON.stringify({id:data.id,signature:sign(null,Buffer.from(data.message),pair.privateKey).toString("base64")});
assert.equal((await call("/api/wallet/verify",{method:"POST",body:proof})).status,401);
const login=await call("/api/wallet/verify",{method:"POST",body:proof,headers:{Cookie:challengeCookie}});
assert.equal(login.status,200);assert.deepEqual(await login.json(),{authenticated:true});
const cookieHeader=login.headers.getSetCookie().find(c=>c.startsWith("repuchain_access="));
assert.ok(cookieHeader?.includes("HttpOnly"));assert.ok(cookieHeader?.includes("SameSite=strict"));
const Cookie=cookieHeader.split(";")[0];
try{
 assert.equal((await call("/api/session",{headers:{Cookie}})).status,200);
 for(const path of ["dashboard","products","inventory","purchases","sales","blockchain/evidence"]){
  const r=await call("/api/backend/"+path,{headers:{Cookie}});assert.equal(r.status,200,path);assert.equal(r.headers.get("cache-control"),"no-store");
 }
 assert.equal((await call("/api/wallet/verify",{method:"POST",body:proof,headers:{Cookie:challengeCookie}})).status,401);
 assert.equal((await call("/api/backend/purchases",{method:"POST",headers:{Cookie,Origin:"https://foreign.invalid"},body:"{}"})).status,403);
 assert.equal((await call("/api/backend/auth/refresh",{headers:{Cookie}})).status,404);
}finally{assert.equal((await call("/api/session",{method:"DELETE",headers:{Cookie}})).status,200);}
assert.equal((await call("/api/session",{headers:{Cookie}})).status,401);
console.log("Wallet web session OK: signature, challenge cookie, replay rejection, HttpOnly, origin checks, access and revocation.");
