export type WalletStage="connecting"|"challenge"|"signing"|"verifying";
export const walletStageText:Record<WalletStage,string>={
 connecting:"Autoriza la conexión en tu wallet…",
 challenge:"Preparando el mensaje de acceso…",
 signing:"Confirma la firma del mensaje en tu wallet…",
 verifying:"Verificando la firma…",
};
export function waitForWallet<T>(operation:()=>Promise<T>,signal:AbortSignal,timeoutMs=60000):Promise<T>{
 return new Promise((resolve,reject)=>{
  if(signal.aborted){reject(new Error("Conexión cancelada"));return;}
  const finish=(callback:()=>void)=>{clearTimeout(timer);signal.removeEventListener("abort",cancel);callback();};
  const cancel=()=>finish(()=>reject(new Error("Conexión cancelada")));
  const timer=setTimeout(()=>finish(()=>reject(new Error("WALLET_TIMEOUT"))),timeoutMs);
  signal.addEventListener("abort",cancel,{once:true});
  Promise.resolve().then(()=>{if(signal.aborted)throw new Error("Conexión cancelada");return operation();}).then(value=>finish(()=>resolve(value)),error=>finish(()=>reject(error)));
 });
}
export function walletError(error:unknown):string{
 const message=error instanceof Error?error.message:String(error??"");
 if(/RPCErr53|Transport request timed out|WALLET_TIMEOUT|timed?\s*out/i.test(message))return "La wallet no respondió a tiempo. Abre y desbloquea la extensión, revisa sus solicitudes pendientes y vuelve a intentarlo. Si usas MetaMask, comprueba que tenga una cuenta Solana.";
 if(/reject|denied|cancel|4001/i.test(message))return "Solicitud cancelada. No se completó el acceso. Cierra también cualquier solicitud pendiente en la wallet antes de reintentar.";
 if(message==="Failed to fetch")return "No se pudo conectar con el servidor de autenticación. Comprueba que RepuChain esté iniciado.";
 return message||"No se pudo conectar con la wallet.";
}
export function chooseMetaMask<T extends {name:string}>(wallets:readonly T[]):T|undefined{
 return wallets.find(wallet=>/metamask/i.test(wallet.name));
}
