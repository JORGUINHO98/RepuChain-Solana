"use client";
import {useEffect,useRef,useState} from "react";
import {getWallets} from "@wallet-standard/app";
import type {Wallet} from "@wallet-standard/base";
import type {StandardConnectFeature} from "@wallet-standard/features";
import type {SolanaSignMessageFeature} from "@solana/wallet-standard-features";
import {api} from "../../lib/panel";
import {chooseBraveWallet,waitForWallet,walletError,walletStageText,type WalletStage} from "../../lib/wallet-login";
import {Brand,Icon,Notice} from "./ui";
type LegacySolanaProvider={connect:(options?:{onlyIfTrusted?:boolean})=>Promise<{publicKey?:{toString:()=>string}}|void>;signMessage:(message:Uint8Array,display?:"utf8"|"hex")=>Promise<{signature:Uint8Array}|Uint8Array>;isConnected?:boolean;publicKey?:{toString:()=>string}};
declare global{interface Window{braveSolana?:LegacySolanaProvider}}
export function Login({onSuccess,expired=false}:{onSuccess:()=>void;expired?:boolean}){
 const [busy,setBusy]=useState(""),[error,setError]=useState("");
 const [stage,setStage]=useState<WalletStage>("connecting");
 const current=useRef<AbortController|null>(null);
 useEffect(()=>()=>{current.current?.abort();current.current=null;},[]);
 async function attempt(name:string,work:(signal:AbortSignal)=>Promise<void>){
  if(current.current)return;
  const controller=new AbortController();current.current=controller;setBusy(name);setStage("connecting");setError("");
  try{await work(controller.signal);if(!controller.signal.aborted)onSuccess();}
  catch(error){if(current.current===controller)setError(walletError(error));}
  finally{controller.abort();if(current.current===controller){current.current=null;setBusy("");}}
 }
 async function authenticate(address:string,sign:(message:Uint8Array)=>Promise<Uint8Array>,signal:AbortSignal){
  setStage("challenge");
  const challenge=await waitForWallet(()=>api("/api/wallet/challenge",{method:"POST",body:JSON.stringify({address}),signal}),signal,15000);
  setStage("signing");
  const signature=await waitForWallet(()=>sign(new TextEncoder().encode(challenge.message)),signal);
  if(!signature||signature.length!==64)throw new Error("La wallet devolvió una firma no compatible.");
  setStage("verifying");
  await waitForWallet(()=>api("/api/wallet/verify",{method:"POST",body:JSON.stringify({id:challenge.id,signature:btoa(String.fromCharCode(...signature))}),signal}),signal,15000);
 }
 async function standard(wallet:Wallet,signal:AbortSignal){
  const connector=wallet.features["standard:connect"] as StandardConnectFeature["standard:connect"];
  const result=await waitForWallet(()=>connector.connect(),signal);
  const account=result.accounts.find(a=>a.chains.some(c=>c.startsWith("solana:"))&&a.features.includes("solana:signMessage"));
  if(!account)throw new Error("Elige una cuenta Solana que permita firmar mensajes.");
  const signer=wallet.features["solana:signMessage"] as SolanaSignMessageFeature["solana:signMessage"];
  await authenticate(account.address,async message=>{
   const [proof]=await signer.signMessage({account,message});
   if(!proof||proof.signedMessage.length!==message.length||!proof.signedMessage.every((b,i)=>b===message[i]))throw new Error("La wallet devolvió un formato de firma no compatible.");
   return proof.signature;
  },signal);
 }
 function connectBrave(){
  if(window.braveSolana)return legacy(window.braveSolana,"Brave Wallet");
  const detected=chooseBraveWallet(getWallets().get().filter(w=>"standard:connect" in w.features&&"solana:signMessage" in w.features));
  if(detected)return attempt("Brave Wallet",signal=>standard(detected,signal));
  setError("No se detectó Brave Wallet. Abre esta página en Brave y selecciona Brave Wallet como cartera predeterminada de Solana en Configuración > Web3.");
 }
 function legacy(provider:LegacySolanaProvider,name:string){return attempt(name,async signal=>{
  const connected=await waitForWallet(()=>provider.connect(),signal);
  const publicKey=connected?.publicKey??provider.publicKey;
  if(!publicKey)throw new Error("La wallet no expuso una cuenta Solana.");
  await authenticate(publicKey.toString(),async message=>{
   const proof=await provider.signMessage(message,"utf8");return proof instanceof Uint8Array?proof:proof.signature;
  },signal);
 });}
 return <main className="login-page"><section className="login-story"><Brand/><div className="login-copy"><p className="eyebrow">INVENTARIO CON HISTORIA</p><h1>Conoce cada pieza.<br/><span>Confía en su recorrido.</span></h1><p>Catálogo, existencias y trazabilidad conectados en un solo lugar.</p><div className="part-diagram" aria-hidden="true"><div className="diagram-grid"/><div className="part-core"><Icon name="inventario" size={110}/></div><span className="part-label a">ORIGEN REGISTRADO</span><span className="part-label b">EVIDENCIA VERIFICABLE</span></div></div></section><section className="login-side"><div className="login-form"><span className="login-symbol"><Icon name="shield" size={28}/></span><p className="eyebrow">ACCESO CON SOLANA</p><h2>Tu wallet, tu acceso</h2><p className="muted">Conecta Brave Wallet y firma un mensaje para entrar. No necesitas correo ni contraseña.</p>{expired&&<Notice>Tu sesión terminó. Conecta y firma de nuevo.</Notice>}{error&&<Notice>{error}</Notice>}
 <button className="button primary login-submit" disabled={!!busy} onClick={connectBrave}>{busy?walletStageText[stage]:"Conectar Brave Wallet"}</button>
 {busy&&<button className="text-link" onClick={()=>current.current?.abort()}>Cancelar intento</button>}
 <p className="login-security"><Icon name="shield" size={16}/> Sin transacciones ni comisiones para entrar</p><p className="small muted">La primera firma crea tu espacio de prueba. Después, usa la misma wallet para recuperar tu inventario.</p><p className="small muted">Abre la app en Brave y usa una cuenta Solana de Brave Wallet.</p><p className="small muted">Nunca solicitamos tu frase semilla. Conectar una wallet no la autoriza como firmante del programa blockchain.</p></div></section></main>;
}
