import {createContext,useContext,useEffect,useState,type ReactNode} from "react";
import type {AuthenticatedUser} from "@repuchain/shared-types";
import {session} from "../../services/api";
type State={user:AuthenticatedUser|null;ready:boolean;error:string;retry:()=>Promise<void>};
const Context=createContext<State>({user:null,ready:false,error:"",retry:async()=>{}});
export function AuthProvider({children}:{children:ReactNode}){
 const [user,setUser]=useState(session.user),[ready,setReady]=useState(false),[error,setError]=useState("");
 async function retry(){setReady(false);setError("");try{await session.restore();}catch(e){setError((e as Error).message);}finally{setUser(session.user);setReady(true);}}
 useEffect(()=>{const off=session.subscribe(()=>setUser(session.user));void retry();return off;},[]);
 return <Context.Provider value={{user,ready,error,retry}}>{children}</Context.Provider>;
}
export const useAuth=()=>useContext(Context);
