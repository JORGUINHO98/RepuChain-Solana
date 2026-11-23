import {NextRequest} from "next/server";
import {COOKIE,sameOrigin,json,upstream,clearSession} from "../../../lib/server-api";
export async function GET(request:NextRequest){
  const token=request.cookies.get(COOKIE)?.value;
  if(!token)return json({message:"Inicia sesión para continuar"},401);
  try{
    const response=await upstream("/auth/me",{headers:{Authorization:"Bearer "+token}});
    const result=json(await response.json(),response.status);
    return response.status===401?clearSession(result):result;
  }catch{return json({message:"No se pudo conectar con la API"},503);}
}
export async function POST(){
  return json({message:"Usa el acceso con wallet"},403);
}
export async function DELETE(request:NextRequest){
  if(!sameOrigin(request))return json({message:"Origen no permitido"},403);
  const token=request.cookies.get(COOKIE)?.value;
  try{if(token)await upstream("/auth/logout",{method:"POST",headers:{Authorization:"Bearer "+token}});}
  catch{return clearSession(json({message:"Sesión local cerrada; no se pudo contactar con el servidor para revocarla."},503));}
  return clearSession(json({signedOut:true}));
}
