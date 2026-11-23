"use client";
import {useEffect,useState} from "react";
import {getWallets} from "@wallet-standard/app";
import type {Wallet} from "@wallet-standard/base";
import type {StandardConnectFeature} from "@wallet-standard/features";
import type {SolanaSignMessageFeature} from "@solana/wallet-standard-features";
import {api} from "../../lib/panel";
import {Brand,Icon,Notice} from "./ui";
let metamaskClient:Promise<import("@metamask/connect-solana").SolanaClient>|undefined;
type LegacySolanaProvider={connect:(options?:{onlyIfTrusted?:boolean})=>Promise<{publicKey?:{toString:()=>string}}|void>;signMessage:(message:Uint8Array,display?:"utf8"|"hex")=>Promise<{signature:Uint8Array}|Uint8Array>;isConnected?:boolean;publicKey?:{toString:()=>string}};
declare global{interface Window{solana?:LegacySolanaProvider;phantom?:{solana?:LegacySolanaProvider};braveSolana?:LegacySolanaProvider;solflare?:LegacySolanaProvider}}
export function Login({onSuccess,expired=false}:{onSuccess:()=>void;expired?:boolean}){
 const [wallets,setWallets]=useState<readonly Wallet[]>([]),[busy,setBusy]=useState(""),[error,setError]=useState(""),[choosing,setChoosing]=useState(false);
 const [legacyWallets,setLegacyWallets]=useState<[LegacySolanaProvider,string][]>([]);
 useEffect(()=>{
  const detect=()=>{
   const found=[
    [window.phantom?.solana,"Phantom"],
    [window.braveSolana,"Brave Wallet"],
    [window.solflare,"Solflare"],
    [window.solana,"Solana"],
   ].filter(([provider],index,items)=>provider&&items.findIndex(([candidate])=>candidate===provider)===index) as [LegacySolanaProvider,string][];
   setLegacyWallets(found);
  };
  detect();
  const interval=window.setInterval(detect,500);
  window.addEventListener("load",detect);
  return()=>{window.clearInterval(interval);window.removeEventListener("load",detect);};
 },[]);
 useEffect(()=>{const registry=getWallets();const update=()=>setWallets(registry.get().filter(w=>"standard:connect" in w.features&&"solana:signMessage" in w.features));update();const a=registry.on("register",update),b=registry.on("unregister",update);return()=>{a();b();};},[]);
 async function connect(wallet:Wallet){
  if(busy)return;setBusy(wallet.name);setError("");
  try{
   const connector=wallet.features["standard:connect"] as StandardConnectFeature["standard:connect"];
   const result=await connector.connect();
   const account=result.accounts.find(a=>a.chains.some(c=>c.startsWith("solana:"))&&a.features.includes("solana:signMessage"));
   if(!account)throw new Error("Elige una cuenta Solana que permita firmar mensajes.");
   const challenge=await api("/api/wallet/challenge",{method:"POST",body:JSON.stringify({address:account.address})});
   const signer=wallet.features["solana:signMessage"] as SolanaSignMessageFeature["solana:signMessage"];
   const message=new TextEncoder().encode(challenge.message);
   const [proof]=await signer.signMessage({account,message});
   if(!proof||proof.signedMessage.length!==message.length||!proof.signedMessage.every((b,i)=>b===message[i]))throw new Error("La wallet devolvió un formato de firma no compatible.");
   const signature=btoa(String.fromCharCode(...proof.signature));
   await api("/api/wallet/verify",{method:"POST",body:JSON.stringify({id:challenge.id,signature})});
   onSuccess();
  }catch(e){const message=(e as Error).message;setError(message==="Failed to fetch"?"No se pudo conectar con el servidor de autenticación. Comprueba que RepuChain esté iniciado y vuelve a intentarlo.":message||"Conexión o firma cancelada. Puedes intentarlo de nuevo.");}finally{setBusy("");}
 }
 async function metamask(){
  if(busy)return;
  try{setBusy("MetaMask");metamaskClient??=import("@metamask/connect-solana").then(m=>m.createSolanaClient({dapp:{name:"RepuChain",url:window.location.origin},skipAutoRegister:true}));const client=await metamaskClient;setBusy("");await connect(client.getWallet());}catch(e){metamaskClient=undefined;const message=(e as Error).message;setError(message==="Failed to fetch"?"No se pudo conectar con el servidor de autenticación. Comprueba que RepuChain esté iniciado y vuelve a intentarlo.":message||"MetaMask canceló la conexión. Puedes intentarlo de nuevo.");setBusy("");}
 }
 async function legacy(provider:LegacySolanaProvider,name:string){
  if(busy)return;setBusy(name);setError("");
  try{
   const connected=await provider.connect();
   const publicKey=connected?.publicKey??provider.publicKey;
   if(!publicKey)throw new Error("La wallet no expuso una cuenta Solana.");
   const address=publicKey.toString();
   const challenge=await api("/api/wallet/challenge",{method:"POST",body:JSON.stringify({address})});
   const proof=await provider.signMessage(new TextEncoder().encode(challenge.message),"utf8");
   const signature=proof instanceof Uint8Array?proof:proof.signature;
   if(!signature||signature.length!==64)throw new Error("La wallet devolvió una firma no compatible.");
   await api("/api/wallet/verify",{method:"POST",body:JSON.stringify({id:challenge.id,signature:btoa(String.fromCharCode(...signature))})});
   onSuccess();
  }catch(e){setError((e as Error).message==="Failed to fetch"?"No se pudo conectar con el servidor de autenticación. Comprueba que RepuChain esté iniciado y vuelve a intentarlo.":(e as Error).message||"Conexión o firma cancelada. Puedes intentarlo de nuevo.");}finally{setBusy("");}
 }
 return <main className="login-page"><section className="login-story"><Brand/><div className="login-copy"><p className="eyebrow">INVENTARIO CON HISTORIA</p><h1>Conoce cada pieza.<br/><span>Confía en su recorrido.</span></h1><p>Catálogo, existencias y trazabilidad conectados en un solo lugar.</p><div className="part-diagram" aria-hidden="true"><div className="diagram-grid"/><div className="part-core"><Icon name="inventario" size={110}/></div><span className="part-label a">ORIGEN REGISTRADO</span><span className="part-label b">EVIDENCIA VERIFICABLE</span></div></div></section><section className="login-side"><div className="login-form"><span className="login-symbol"><Icon name="shield" size={28}/></span><p className="eyebrow">ACCESO CON SOLANA</p><h2>Tu wallet, tu acceso</h2><p className="muted">Conecta tu wallet y firma un mensaje para entrar. No necesitas correo ni contraseña.</p>{expired&&<Notice>Tu sesión terminó. Conecta y firma de nuevo.</Notice>}{error&&<Notice>{error}</Notice>}
 <button className="button primary login-submit" disabled={!!busy} onClick={()=>setChoosing(true)}>Conectar wallet</button>
 {choosing&&<div style={{display:"grid",gap:12,marginTop:20}}><button className="button secondary" disabled={!!busy} onClick={metamask}>MetaMask · Solana</button>{wallets.map((w,i)=><button key={w.name+i} className="button secondary" disabled={!!busy} onClick={()=>connect(w)}>{busy===w.name?"Confirma la firma en tu wallet…":w.name}</button>)}{legacyWallets.filter(([,name])=>!wallets.some(w=>w.name.toLowerCase().includes(name.toLowerCase())||name.toLowerCase().includes(w.name.toLowerCase()))).map(([provider,name])=><button key={name} className="button secondary" disabled={!!busy} onClick={()=>legacy(provider,name)}>{busy===name?"Confirma la firma en tu wallet…":name}</button>)}{!wallets.length&&!legacyWallets.length&&<Notice>No se detectó una wallet compatible. Abre esta página en un navegador con una wallet Solana instalada y desbloqueada.</Notice>}<button className="text-link" disabled={!!busy} onClick={()=>setChoosing(false)}>Cancelar</button></div>}
 <p className="login-security"><Icon name="shield" size={16}/> Sin transacciones ni comisiones para entrar</p><p className="small muted">La primera firma crea tu espacio de prueba. Después, usa la misma wallet para recuperar tu inventario.</p><p className="small muted">Compatible con wallets Solana que ofrecen Wallet Standard y firma de mensajes. MetaMask debe exponer su cuenta Solana; una cuenta Ethereum no sirve para este acceso.</p><p className="small muted">Nunca solicitamos tu frase semilla. Conectar una wallet no la autoriza como firmante del programa blockchain.</p></div></section></main>;
}
