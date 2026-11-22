import {beforeAll,afterAll,it,expect} from "vitest";
import {randomUUID} from "node:crypto";
import {setup,teardown,request,db,companyId,password,slug} from "./helpers";
beforeAll(setup);afterAll(teardown);
const input={companySlug:"jury-"+randomUUID(),companyName:"Jurado",name:"Evaluador",email:"jury@test.local",password};
let token:string;
it("registra una empresa aislada con sesión y permisos",async()=>{
 const r=await request("POST","/auth/register",input,"");expect(r.status).toBe(201);token=r.body.accessToken;
 const me=await request("GET","/auth/me",undefined,token);expect(me.body.companyId).not.toBe(companyId);expect(me.body.role).toBe("ADMIN");expect(me.body.permissions).toContain("sales:write");
 expect((await request("GET","/products",undefined,token)).body.total).toBe(0);
 const user=await db.user.findFirstOrThrow({where:{email:input.email,company:{slug:input.companySlug}}});expect(user.passwordHash).not.toBe(password);
});
it("no permite apropiarse de una empresa existente",async()=>{
 const before=await db.user.count({where:{companyId}});
 const r=await request("POST","/auth/register",{...input,companySlug:slug},"");expect(r.status).toBe(409);
 expect(await db.user.count({where:{companyId}})).toBe(before);
 expect((await request("POST","/auth/register",input,"")).status).toBe(409);
});
it("rechaza campos de permisos y contraseñas cortas",async()=>{
 expect((await request("POST","/auth/register",{...input,companySlug:"new-"+randomUUID(),roleId:randomUUID()},"")).status).toBe(400);
 expect((await request("POST","/auth/register",{...input,password:"short"},"")).status).toBe(400);
});
it("limita intentos de registro",async()=>{
 expect((await request("POST","/auth/register",input,"")).status).toBe(429);
});
