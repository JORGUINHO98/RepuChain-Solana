import {NextRequest,NextResponse} from "next/server";
export const COOKIE="repuchain_access";
export class ApiConfigurationError extends Error{
 constructor(message:string){super(message);this.name="ApiConfigurationError";}
}
const base=()=>{
 const configured=process.env.API_INTERNAL_URL;
 if(process.env.NODE_ENV==="production"){
  if(!configured)throw new ApiConfigurationError("API_INTERNAL_URL no está configurada. Despliega la API y configura su URL HTTPS terminada en /api/v1 en Vercel.");
  let url:URL;
  try{url=new URL(configured);}catch{throw new ApiConfigurationError("API_INTERNAL_URL debe ser una URL HTTPS válida terminada en /api/v1.");}
  const path=url.pathname.replace(/\/+$/,"");
  const loopback=["localhost","127.0.0.1","[::1]"].includes(url.hostname);
  const localHttp=!process.env.VERCEL&&url.protocol==="http:"&&loopback;
  if((url.protocol!=="https:"&&!localHttp)||(process.env.VERCEL==="1"&&loopback)||!path.endsWith("/api/v1"))throw new ApiConfigurationError("API_INTERNAL_URL debe apuntar por HTTPS a una API accesible y terminar en /api/v1.");
  return url.origin+path;
 }
 return configured??process.env.NEXT_PUBLIC_API_URL??"http://127.0.0.1:4000/api/v1";
};
export function sameOrigin(request:NextRequest){try{const origin=new URL(request.headers.get("origin")??"");return origin.host===request.headers.get("host")&&origin.protocol===request.nextUrl.protocol;}catch{return false;}}
export function json(body:unknown,status=200){return NextResponse.json(body,{status,headers:{"Cache-Control":"no-store"}});}
export async function upstream(path:string,options:RequestInit={}){
  return fetch(base().replace(/\/$/,"")+path,{...options,cache:"no-store",signal:AbortSignal.timeout(15000)});
}
export function clearSession(response:NextResponse){response.cookies.set(COOKIE,"",{httpOnly:true,sameSite:"strict",path:"/",maxAge:0});return response;}
