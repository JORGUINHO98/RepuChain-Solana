import * as SecureStore from "expo-secure-store";
import {SessionClient} from "./session-core";
const base=(process.env.EXPO_PUBLIC_API_URL??"http://127.0.0.1:4000/api/v1").replace(/\/$/,"");
const options={keychainAccessible:SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY};
export const privateStorage={
 get:(key:string)=>SecureStore.getItemAsync(key,options),
 set:(key:string,value:string)=>SecureStore.setItemAsync(key,value,options),
 remove:(key:string)=>SecureStore.deleteItemAsync(key,options),
};
export const session=new SessionClient(base,{
 get:()=>privateStorage.get("repuchain.session"),
 set:value=>privateStorage.set("repuchain.session",value),
 remove:()=>privateStorage.remove("repuchain.session"),
});
