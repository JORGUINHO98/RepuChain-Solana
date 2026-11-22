import {NextRequest,NextResponse} from "next/server";
export const COOKIE="repuchain_access";
const base=()=>process.env.API_INTERNAL_URL??process.env.NEXT_PUBLIC_API_URL??"http://127.0.0.1:4000/api/v1";
export function sameOrigin(request:NextRequest){try{const origin=new URL(request.headers.get("origin")??"");return origin.host===request.headers.get("host")&&origin.protocol===request.nextUrl.protocol;}catch{return false;}}
export function json(body:unknown,status=200){return NextResponse.json(body,{status,headers:{"Cache-Control":"no-store"}});}
export async function upstream(path:string,options:RequestInit={}){
  return fetch(base().replace(/\/$/,"")+path,{...options,cache:"no-store",signal:AbortSignal.timeout(15000)});
}
export function clearSession(response:NextResponse){response.cookies.set(COOKIE,"",{httpOnly:true,sameSite:"strict",path:"/",maxAge:0});return response;}
