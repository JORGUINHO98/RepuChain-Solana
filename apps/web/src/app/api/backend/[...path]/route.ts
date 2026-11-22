import {NextRequest} from "next/server";
import {COOKIE,sameOrigin,json,upstream,clearSession} from "../../../../lib/server-api";
const resources=new Set(["dashboard","products","categories","brands","vehicles","suppliers","warehouses","batches","inventory","movements","purchases","sales","blockchain","users","roles","companies","audit"]);
async function handle(request:NextRequest,context:{params:Promise<{path:string[]}>}){
  if(!["GET","POST","PATCH"].includes(request.method))return json({message:"Método no permitido"},405);
  if(request.method!=="GET"&&!sameOrigin(request))return json({message:"Origen no permitido"},403);
  const parts=(await context.params).path;
  if(!resources.has(parts[0]??"")||parts.some(p=>!/^[-a-zA-Z0-9]+$/.test(p)))return json({message:"Ruta no disponible"},404);
  const token=request.cookies.get(COOKIE)?.value;if(!token)return json({message:"La sesión terminó. Vuelve a iniciar sesión."},401);
  try{
    const headers:Record<string,string>={Authorization:"Bearer "+token,"Content-Type":"application/json"};
    const key=request.headers.get("Idempotency-Key");if(key)headers["Idempotency-Key"]=key;
    const response=await upstream("/"+parts.join("/")+request.nextUrl.search,{method:request.method,headers,
      ...(request.method==="GET"?{}:{body:await request.text()})});
    const output=json(await response.json(),response.status);
    return response.status===401?clearSession(output):output;
  }catch{return json({message:"No se pudo conectar con la API. Tus datos no se descartaron; puedes reintentar."},503);}
}
export {handle as GET,handle as POST,handle as PATCH};
