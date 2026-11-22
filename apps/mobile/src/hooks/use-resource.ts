import {useCallback,useState} from "react";
import {useFocusEffect} from "expo-router";
import {session} from "../services/api";
export function useResource<T>(path:string|null){
 const [data,setData]=useState<T|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState(""),[revision,setRevision]=useState(0);
 useFocusEffect(useCallback(()=>{let active=true;setError("");setData(null);if(!path){setLoading(false);return;}setLoading(true);session.request<T>(path).then(v=>{if(active)setData(v);}).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[path,revision]));
 return {data,loading,error,reload:()=>setRevision(v=>v+1)};
}
