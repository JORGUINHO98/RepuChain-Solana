import assert from "node:assert/strict";
import {resolve} from "node:path";
process.loadEnvFile(resolve("database/.env"));
const origin=process.env.WEB_URL??"http://127.0.0.1:3000";
const credentials={companySlug:"demo",email:process.env.SEED_ADMIN_EMAIL,password:process.env.SEED_ADMIN_PASSWORD};
const call=(path,options={})=>fetch(origin+path,{...options,headers:{"Content-Type":"application/json",Origin:origin,...options.headers}});
assert.equal((await call("/api/session")).status,401);
assert.equal((await call("/api/backend/dashboard")).status,401);
assert.equal((await call("/api/session",{method:"POST",headers:{Origin:"https://foreign.invalid"},body:JSON.stringify(credentials)})).status,403);
const login=await call("/api/session",{method:"POST",body:JSON.stringify(credentials)});
assert.equal(login.status,200);
assert.deepEqual(await login.json(),{authenticated:true});
const cookieHeader=login.headers.get("set-cookie");
assert.ok(cookieHeader?.includes("HttpOnly"));assert.ok(cookieHeader?.includes("SameSite=strict"));assert.ok(cookieHeader?.includes("Max-Age=900"));
const Cookie=cookieHeader.split(";")[0];
try{
 assert.equal((await call("/api/session",{headers:{Cookie}})).status,200);
 for(const path of ["dashboard","products","inventory","purchases","sales","blockchain/evidence","companies/me"]){
  const r=await call("/api/backend/"+path,{headers:{Cookie}});
  assert.equal(r.status,200,path);assert.equal(r.headers.get("cache-control"),"no-store");
 }
 assert.equal((await call("/api/backend/purchases",{method:"POST",headers:{Cookie,Origin:"https://foreign.invalid"},body:"{}"})).status,403);
 assert.equal((await call("/api/backend/auth/refresh",{headers:{Cookie}})).status,404);
 assert.equal((await call("/api/backend/purchases",{method:"POST",headers:{Cookie},body:"{}"})).status,400);
 for(const route of ["/","/catalogo","/inventario","/compras","/ventas","/trazabilidad"])assert.equal((await call(route)).status,200,route);
}finally{
 const logout=await call("/api/session",{method:"DELETE",headers:{Cookie}});assert.equal(logout.status,200);assert.ok(logout.headers.get("set-cookie")?.includes("Max-Age=0"));
}
assert.equal((await call("/api/session",{headers:{Cookie}})).status,401);
console.log("Web session checks passed: HttpOnly cookie, origin validation, authenticated proxy, pages and server-side revocation. No credentials or tokens printed.");
