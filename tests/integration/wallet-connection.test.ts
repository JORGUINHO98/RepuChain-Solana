import {afterEach,it,expect,vi} from "vitest";
import {waitForWallet,walletError,chooseBraveWallet,walletStageText} from "../../apps/web/src/lib/wallet-login";
afterEach(()=>vi.useRealTimers());
it("selecciona Brave Wallet y excluye otras wallets",()=>{
 const brave={name:"Brave Wallet"},meta={name:"MetaMask Solana"};
 expect(chooseBraveWallet([brave,meta])).toBe(brave);expect(chooseBraveWallet([meta])).toBeUndefined();
});
it("distingue conexión de firma",()=>{expect(walletStageText.connecting).not.toContain("firma");expect(walletStageText.signing).toContain("firma");});
it("limita una operación que no responde",async()=>{
 vi.useFakeTimers();const controller=new AbortController();
 const result=waitForWallet(()=>new Promise(()=>{}),controller.signal,100);
 const check=expect(result).rejects.toThrow("WALLET_TIMEOUT");await vi.advanceTimersByTimeAsync(101);await check;
});
it("ignora una respuesta tardía después de cancelar",async()=>{
 let resolve!:(v:string)=>void;const controller=new AbortController(),next=vi.fn();
 const result=waitForWallet(()=>new Promise<string>(r=>{resolve=r;}),controller.signal).then(next);
 const check=expect(result).rejects.toThrow("cancelada");await Promise.resolve();controller.abort();await check;resolve("late");await Promise.resolve();expect(next).not.toHaveBeenCalled();
});
it("no inicia una operación ya cancelada",async()=>{
 const controller=new AbortController();controller.abort();const operation=vi.fn();
 await expect(waitForWallet(operation,controller.signal)).rejects.toThrow("cancelada");expect(operation).not.toHaveBeenCalled();
});
it("explica el timeout de transporte de MetaMask",()=>{expect(walletError(new Error("RPCErr53: Transport request timed out"))).toContain("no respondió");});
