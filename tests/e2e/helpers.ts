import { spawn,type ChildProcess } from "node:child_process";
import { createServer } from "node:net";
import { once } from "node:events";
import { randomUUID,randomBytes } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { createDatabase } from "../../database/dist/index.js";
import { provisionCompany } from "../../database/dist/bootstrap.js";
export const db=createDatabase(process.env.TEST_DATABASE_URL!);
export const password="Test-"+randomBytes(16).toString("hex");
export const slug="test-"+randomUUID();
export let base="",adminToken="",otherToken="";
export let companyId="",otherCompanyId="",adminId="";
let api:ChildProcess|undefined;
export async function request(method:string,path:string,body?:unknown,token=adminToken,key?:string){
  const response=await fetch(base+path,{
    method,headers:{"Content-Type":"application/json",...(token?{Authorization:"Bearer "+token}:{}),...(key?{"Idempotency-Key":key}:{})},
    ...(body===undefined?{}:{body:JSON.stringify(body)}),
  });
  return {status:response.status,body:await response.json() as any};
}
export async function login(email="admin@test.local",companySlug=slug){
  const result=await request("POST","/auth/login",{companySlug,email,password},"");
  if(result.status!==200) throw new Error("Login de fixture falló: "+result.status);
  return result.body as {accessToken:string;refreshToken:string};
}
export async function setup(){
  const a=await provisionCompany(db,{slug,name:"Empresa A",adminEmail:"admin@test.local",adminPassword:password});
  const b=await provisionCompany(db,{slug:slug+"-b",name:"Empresa B",adminEmail:"admin@test.local",adminPassword:password});
  companyId=a.company.id;adminId=a.adminId;otherCompanyId=b.company.id;
  const socket=createServer();socket.listen(0,"127.0.0.1");await once(socket,"listening");
  const address=socket.address();if(!address||typeof address==="string")throw new Error("No hay puerto");
  const port=address.port;await new Promise<void>(resolve=>socket.close(()=>resolve()));
  base="http://127.0.0.1:"+port+"/api/v1";
  api=spawn(process.execPath,["dist/main.js"],{cwd:"apps/api",env:{...process.env,DATABASE_URL:process.env.TEST_DATABASE_URL!,JWT_SECRET:process.env.JWT_SECRET!,PORT:String(port),HOST:"127.0.0.1",NODE_ENV:"test"},stdio:["ignore","pipe","pipe"]});
  let logs="";api.stdout?.on("data",v=>logs+=v);api.stderr?.on("data",v=>logs+=v);
  let ready=false;
  for(let i=0;i<100;i++){
    if(api.exitCode!==null)throw new Error("API no inició: "+logs);
    try{const r=await fetch(base+"/health");if(r.ok){ready=true;break;}}catch{}
    await delay(100);
  }
  if(!ready)throw new Error("Timeout de API: "+logs);
  adminToken=(await login()).accessToken;
  otherToken=(await login("admin@test.local",slug+"-b")).accessToken;
}
export async function teardown(){
  if(api&&api.exitCode===null){
    api.kill("SIGTERM");
    await Promise.race([once(api,"exit"),delay(3000)]);
    if(api.exitCode===null)api.kill("SIGKILL");
  }
  await db.$disconnect();
}
