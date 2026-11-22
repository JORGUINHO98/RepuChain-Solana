import type {AuthenticatedUser,TokenResponse} from "@repuchain/shared-types";
export interface PrivateStore {get():Promise<string|null>;set(value:string):Promise<void>;remove():Promise<void>}
export class ApiError extends Error {constructor(message:string,readonly status:number){super(message);}}
type Saved={base:string;tokens:TokenResponse;expiresAt:number};
export class SessionClient{
 private saved:Saved|null=null;
 private generation=0;
 private refreshing:Promise<void>|null=null;
 private writing:Promise<void>=Promise.resolve();
 private listeners=new Set<()=>void>();
 user:AuthenticatedUser|null=null;
 constructor(readonly base:string,private store:PrivateStore,private transport:typeof fetch=fetch){}
 subscribe=(fn:()=>void)=>{this.listeners.add(fn);return()=>{this.listeners.delete(fn);};};
 private notify(){this.listeners.forEach(fn=>fn());}
 private persist(value:Saved|null){const run=this.writing.catch(()=>{}).then(()=>value?this.store.set(JSON.stringify(value)):this.store.remove());this.writing=run;return run;}
 private async raw(path:string,options:RequestInit={}){
  let response:Response;
  try{response=await this.transport(this.base+path,{...options,headers:{"Content-Type":"application/json",...options.headers},signal:AbortSignal.timeout(15000)});}
  catch{throw new ApiError("No se pudo conectar. Comprueba tu conexión e inténtalo de nuevo.",0);}
  const body=await response.json().catch(()=>({message:"Respuesta inválida del servidor"}));
  if(!response.ok)throw new ApiError(Array.isArray(body.message)?body.message.join(". "):body.message??"No se pudo completar la operación",response.status);
  return body;
 }
 async restore(){
  const generation=this.generation;
  const raw=await this.store.get();if(!raw)return;
  try{const saved=JSON.parse(raw) as Saved;if(saved.base!==this.base||typeof saved.tokens?.refreshToken!=="string"||typeof saved.tokens?.accessToken!=="string"||!Number.isFinite(saved.expiresAt))throw new Error();this.saved=saved;}
  catch{await this.persist(null);return;}
  const user=await this.request<AuthenticatedUser>("/auth/me");
  if(generation===this.generation){this.user=user;this.notify();}
 }
 async login(companySlug:string,email:string,password:string){
  const generation=++this.generation;
  const tokens=await this.raw("/auth/login",{method:"POST",body:JSON.stringify({companySlug,email,password})}) as TokenResponse;
  if(generation!==this.generation)return;
  const saved={base:this.base,tokens,expiresAt:Date.now()+tokens.expiresIn*1000};
  await this.persist(saved);if(generation!==this.generation)return;this.saved=saved;
  const user=await this.request<AuthenticatedUser>("/auth/me");if(generation===this.generation){this.user=user;this.notify();}
 }
 private async refresh(){
  if(this.refreshing)return this.refreshing;
  const generation=this.generation,saved=this.saved;
  if(!saved)throw new ApiError("Inicia sesión para continuar.",401);
  const promise=(async()=>{try{
   const tokens=await this.raw("/auth/refresh",{method:"POST",body:JSON.stringify({refreshToken:saved.tokens.refreshToken})}) as TokenResponse;
   if(generation!==this.generation)throw new ApiError("La sesión ha terminado.",401);
   const next={base:this.base,tokens,expiresAt:Date.now()+tokens.expiresIn*1000};
   await this.persist(next);if(generation===this.generation)this.saved=next;
  }catch(e){
   // A lost refresh response can have consumed the rotating token. Never replay it.
   if(generation===this.generation)await this.clear();
   throw e;
  }})();
  this.refreshing=promise;
  try{await promise;}finally{if(this.refreshing===promise)this.refreshing=null;}
 }
 private async clear(){this.generation++;this.saved=null;this.user=null;this.notify();await this.persist(null);}
 async request<T=any>(path:string,options:RequestInit={}):Promise<T>{
  if(!/^\/[a-z]/.test(path)||path.includes("://"))throw new Error("Ruta inválida");
  if(!this.saved)throw new ApiError("Inicia sesión para continuar.",401);
  if(this.saved.expiresAt<=Date.now()+30000)await this.refresh();
  const generation=this.generation;
  const token=this.saved?.tokens.accessToken;if(!token)throw new ApiError("La sesión ha terminado.",401);
  const send=()=>this.raw(path,{...options,headers:{...options.headers,Authorization:"Bearer "+this.saved?.tokens.accessToken}});
  try{return await send();}catch(e){
   if(generation!==this.generation||!(e instanceof ApiError)||e.status!==401)throw e;
   if(this.saved?.tokens.accessToken===token)await this.refresh();
   try{return await send();}catch(error){if(error instanceof ApiError&&error.status===401)await this.clear();throw error;}
  }
 }
 async logout(){
  let warning="";
  try{if(this.saved)await this.request("/auth/logout",{method:"POST"});}
  catch{warning="Sesión cerrada en este teléfono. Sin conexión no se pudo confirmar su revocación en el servidor.";}
  finally{await this.clear();}
  return warning;
 }
}
