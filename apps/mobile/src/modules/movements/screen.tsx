import {useEffect,useRef,useState} from "react";
import {Text,View,Alert,Pressable} from "react-native";
import {router,useLocalSearchParams} from "expo-router";
import * as Crypto from "expo-crypto";
import type {BatchDto,WarehouseDto,Page} from "@repuchain/shared-types";
import {movementSchema} from "@repuchain/validation";
import {session,privateStorage} from "../../services/api";
import {ApiError} from "../../services/session-core";
import {readPending,type PendingMovement} from "../../services/movement-draft";
import {useAuth} from "../auth/provider";
import {Choice} from "../../components/choice";
import {Screen,Field,Button,ErrorNotice,Loading,s} from "../../components/ui";
async function all<T>(path:string){let items:T[]=[];for(let page=1;;page++){const result=await session.request<Page<T>>(path+"?limit=100&page="+page);items=items.concat(result.items);if(items.length>=result.total||!result.items.length)return items;}}
export function MovementScreen(){
 const {user}=useAuth();const params=useLocalSearchParams<{batchId?:string}>();
 const [batches,setBatches]=useState<BatchDto[]>([]),[warehouses,setWarehouses]=useState<WarehouseDto[]>([]);
 const [batchId,setBatch]=useState(params.batchId??""),[type,setType]=useState<"IN"|"OUT"|"TRANSFER">("IN"),[quantity,setQuantity]=useState("1"),[source,setSource]=useState(""),[destination,setDestination]=useState(""),[reason,setReason]=useState("");
 const [pending,setPending]=useState<PendingMovement|null>(null),[loading,setLoading]=useState(true),[loadError,setLoadError]=useState(""),[error,setError]=useState(""),[busy,setBusy]=useState(false),[done,setDone]=useState<string|null>(null),[revision,setRevision]=useState(0);
 const lock=useRef(false);const allowed=user?.permissions.includes("inventory:write");
 const storageKey="repuchain.pending."+user?.companyId+"."+user?.id;
 useEffect(()=>{let active=true;if(!allowed){setLoading(false);return;}setLoading(true);setLoadError("");
 (async()=>{
  // Restore before fetching choices so an uncertain operation survives an offline restart.
  const saved=await privateStorage.get(storageKey);
  if(saved){const p=readPending(saved,{base:session.base,userId:user!.id,companyId:user!.companyId});if(active)setPending(p);}
  const [b,w]=await Promise.all([all<BatchDto>("/batches"),all<WarehouseDto>("/warehouses")]);if(active){setBatches(b);setWarehouses(w);}
 })().catch(e=>{if(active)setLoadError(e.message);}).finally(()=>{if(active)setLoading(false);});
 return()=>{active=false;};},[storageKey,revision,allowed]);
 async function send(){
  if(lock.current||!user)return;lock.current=true;setBusy(true);setError("");
  let attempt=pending;
  try{
   if(!attempt){const parsed=movementSchema.safeParse({batchId,type,quantity:Number(quantity),...(type!=="IN"?{sourceWarehouseId:source}:{}),...(type!=="OUT"?{destinationWarehouseId:destination}:{}),reason});
    if(!parsed.success)throw new Error("Revisa el lote, la cantidad entera positiva, los almacenes y un motivo de al menos 3 caracteres.");
    attempt={base:session.base,userId:user.id,companyId:user.companyId,key:Crypto.randomUUID(),body:parsed.data};
    await privateStorage.set(storageKey,JSON.stringify(attempt));setPending(attempt);
   }
   await session.request("/movements",{method:"POST",headers:{"Idempotency-Key":attempt.key},body:JSON.stringify(attempt.body)});
   await privateStorage.remove(storageKey);setPending(null);setDone(attempt.body.batchId);
  }catch(e){
   if(e instanceof ApiError&&e.status>=400&&e.status<500&&![401,408,429].includes(e.status)){
    // Keep a conflicting key for review: it must never silently become a new operation.
    if(e.status!==409){try{await privateStorage.remove(storageKey);setPending(null);}catch{setError("No se pudo borrar el envío del almacenamiento seguro. Conserva este registro y vuelve a intentarlo.");return;}}
   }
   setError((e as Error).message);
  }finally{lock.current=false;setBusy(false);}
 }
 function discard(){Alert.alert("Revisar antes de descartar","El envío pudo haberse registrado. Consulta el historial del lote antes de crear otro movimiento.",[{text:"Conservar",style:"cancel"},{text:"Descartar envío pendiente",style:"destructive",onPress:()=>{privateStorage.remove(storageKey).then(()=>{setPending(null);setError("");}).catch(e=>setError(e.message));}}]);}
 if(!allowed)return <Screen><ErrorNotice message="Tu rol no puede registrar movimientos."/></Screen>;
 if(done)return <Screen><Text style={s.label}>MOVIMIENTO REGISTRADO</Text><Text style={s.title}>Existencias actualizadas</Text><Text style={s.subtitle}>La operación quedó registrada. Su evidencia puede estar pendiente de confirmación en Solana.</Text><Button title="Consultar lote" onPress={()=>router.replace({pathname:"/batch/[id]",params:{id:done}})}/><Button title="Volver al inicio" secondary onPress={()=>router.replace("/home")}/></Screen>;
 return <Screen><Text style={s.title}>{pending?"Envío pendiente":"Registrar movimiento"}</Text><Text style={s.subtitle}>Las existencias se actualizan al confirmar el registro en el servidor.</Text><ErrorNotice message={loadError||error}/>
 {loading?<Loading/>:pending?<View style={s.card}><Text style={s.text}>Conservamos el mismo envío</Text><Text style={s.small}>{pending.body.type} · {pending.body.quantity} unidades</Text><Text selectable style={s.small}>Lote: {pending.body.batchId}</Text><Text style={s.small}>{pending.body.reason}</Text><Text style={s.small}>Reintentar usa la misma clave y no crea un segundo movimiento. Comprueba el historial antes de descartarlo.</Text><Button title="Ver historial del lote" secondary disabled={busy} onPress={()=>router.push({pathname:"/batch/[id]",params:{id:pending.body.batchId}})}/><Button title="Descartar envío pendiente" secondary disabled={busy} onPress={discard}/></View>:<><View style={s.row}>{(["IN","OUT","TRANSFER"] as const).map(t=><Pressable key={t} accessibilityRole="button" accessibilityState={{selected:t===type,disabled:busy}} disabled={busy} onPress={()=>setType(t)} style={[s.chip,type===t&&s.selected]}><Text style={s.text}>{{IN:"Entrada",OUT:"Salida",TRANSFER:"Transferencia"}[t]}</Text></Pressable>)}</View>
 <Choice label="Lote" value={batchId} items={batches.filter(b=>type!=="IN"||b.product.active).map(b=>({id:b.id,label:b.code+" · "+b.product.name}))} onChange={setBatch} disabled={busy}/>
 {type!=="IN"&&<Choice label="Almacén de origen" value={source} items={warehouses.filter(w=>w.active).map(w=>({id:w.id,label:w.name}))} onChange={setSource} disabled={busy}/>}
 {type!=="OUT"&&<Choice label="Almacén de destino" value={destination} items={warehouses.filter(w=>w.active).map(w=>({id:w.id,label:w.name}))} onChange={setDestination} disabled={busy}/>}
 <Field label="Cantidad de unidades" keyboardType="number-pad" value={quantity} onChangeText={setQuantity} maxLength={10} editable={!busy}/><Field label="Motivo" value={reason} onChangeText={setReason} multiline maxLength={500} editable={!busy}/></>}
 <Button title={busy?"Registrando…":pending?"Reintentar el mismo envío":"Registrar movimiento"} onPress={send} disabled={busy||loading||(!pending&&!!loadError)}/>
 {!!loadError&&<Button title="Recargar opciones" secondary disabled={busy||loading} onPress={()=>setRevision(v=>v+1)}/>}
 <Text style={s.small}>No se envían movimientos automáticamente sin conexión. Un envío pendiente se conserva cifrado para revisarlo y reintentarlo.</Text></Screen>;
}
