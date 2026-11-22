import {useEffect,useState} from "react";
import {Text,View} from "react-native";
import {router} from "expo-router";
import type {BatchDto,ProductDto,Page} from "@repuchain/shared-types";
import {useAuth} from "../auth/provider";
import {useResource} from "../../hooks/use-resource";
import {Screen,Field,Button,ErrorNotice,Loading,s} from "../../components/ui";
export function InventoryList({products=false}:{products?:boolean}){
 const {user}=useAuth();const permitted=user?.permissions.includes(products?"catalog:read":"inventory:read");
 const [input,setInput]=useState(""),[search,setSearch]=useState(""),[page,setPage]=useState(1);
 useEffect(()=>{const t=setTimeout(()=>{setSearch(input);setPage(1);},350);return()=>clearTimeout(t);},[input]);
 const {data,loading,error,reload}=useResource<Page<BatchDto&ProductDto>>(permitted?"/"+(products?"products":"batches")+"?limit=20&page="+page+"&search="+encodeURIComponent(search):null);
 return <Screen><Text style={s.title}>{products?"Tus repuestos":"Consulta de lotes"}</Text>{!permitted?<ErrorNotice message="Tu rol no tiene acceso a este módulo."/>:<><Field label={products?"Buscar por nombre":"Buscar por código de lote"} value={input} onChangeText={setInput} maxLength={100}/><ErrorNotice message={error}/>{loading?<Loading/>:data&&<>{data.items.length?data.items.map(row=><View key={row.id} style={s.card}><Text style={s.label}>{products?row.sku:row.code}</Text><Text style={s.text}>{products?row.name:row.product.name}</Text><Text style={s.small}>{products?(row.active?"Activo":"Inactivo")+" · mínimo "+row.minimumStock:row.supplier?.name??"Sin proveedor asignado"}</Text>{products?<Text style={s.small}>{row.description||"Sin descripción"}</Text>:<Button title="Ver existencias y trazabilidad" secondary onPress={()=>router.push({pathname:"/batch/[id]",params:{id:row.id}})}/>}</View>):<Text style={s.small}>No hay registros que coincidan con la búsqueda.</Text>}<Text style={s.small}>{data.total} registros · página {page}</Text><View style={s.row}><Button title="Anterior" secondary disabled={page===1} onPress={()=>setPage(p=>p-1)}/><Button title="Siguiente" secondary disabled={page*20>=data.total} onPress={()=>setPage(p=>p+1)}/></View></>}<Button title="Actualizar" secondary onPress={reload} disabled={loading}/></>}</Screen>;
}
