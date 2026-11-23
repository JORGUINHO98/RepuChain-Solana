import {NextRequest} from "next/server";
import {ApiConfigurationError,COOKIE,json,upstream,sameOrigin} from "../../../../lib/server-api";
const CHALLENGE="repuchain_wallet_challenge";
export async function POST(request:NextRequest,{params}:{params:Promise<{action:string}>}){
 if(!sameOrigin(request))return json({message:"Origen no permitido"},403);
 const {action}=await params;if(!["challenge","verify"].includes(action))return json({message:"Ruta inválida"},404);
 try{
  const body=await request.json();const origin=request.headers.get("origin")!;
  if(action==="verify"&&(!body.id||request.cookies.get(CHALLENGE)?.value!==body.id))return json({message:"Vuelve a conectar tu wallet para iniciar sesión"},401);
  const response=await upstream("/auth/wallet/"+action,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(action==="challenge"?{address:body.address,origin}:{id:body.id,signature:body.signature,origin})});
  const data=await response.json();if(!response.ok)return json({message:data.message??"No se pudo autenticar la wallet"},response.status);
  const result=json(action==="challenge"?data:{authenticated:true});
  if(action==="challenge")result.cookies.set(CHALLENGE,data.id,{httpOnly:true,sameSite:"strict",secure:request.nextUrl.protocol==="https:",path:"/api/wallet",maxAge:300});
  else{
   result.cookies.set(COOKIE,data.accessToken,{httpOnly:true,sameSite:"strict",secure:request.nextUrl.protocol==="https:",path:"/",maxAge:data.expiresIn});
   result.cookies.set(CHALLENGE,"",{httpOnly:true,sameSite:"strict",path:"/api/wallet",maxAge:0});
  }
  return result;
 }catch(error){
  console.error("Wallet authentication API request failed",error);
  return json({message:error instanceof ApiConfigurationError?error.message:"No se pudo conectar con la API de autenticación. Comprueba que esté desplegada y que API_INTERNAL_URL apunte a su URL HTTPS."},503);
 }
}
