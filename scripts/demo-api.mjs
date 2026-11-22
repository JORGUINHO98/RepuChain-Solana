import { resolve } from "node:path";
process.loadEnvFile(resolve("database/.env"));
const base=process.env.API_URL??"http://127.0.0.1:4000/api/v1";
const response=await fetch(base+"/auth/login",{
  method:"POST",headers:{"Content-Type":"application/json"},
  body:JSON.stringify({companySlug:"demo",email:process.env.SEED_ADMIN_EMAIL,password:process.env.SEED_ADMIN_PASSWORD}),
});
if(!response.ok)throw new Error("No se pudo iniciar sesión. Ejecuta db:seed y comprueba la API.");
const {accessToken}=await response.json();
const headers={Authorization:"Bearer "+accessToken};
try{
  for(const path of ["/companies/me","/products","/warehouses","/batches","/inventory"]){
    const result=await fetch(base+path,{headers});
    if(!result.ok)throw new Error(path+": HTTP "+result.status);
    console.log(path,JSON.stringify(await result.json(),null,2));
  }
}finally{
  const logout=await fetch(base+"/auth/logout",{method:"POST",headers});
  if(!logout.ok)throw new Error("No se pudo cerrar la sesión de demostración");
}
