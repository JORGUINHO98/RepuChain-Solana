import {Text,View,Alert} from "react-native";
import {router} from "expo-router";
import type {DashboardDto} from "@repuchain/shared-types";
import {useAuth} from "../../src/modules/auth/provider";
import {session} from "../../src/services/api";
import {useResource} from "../../src/hooks/use-resource";
import {Screen,Button,ErrorNotice,Loading,s} from "../../src/components/ui";
export default function Home(){
 const {user}=useAuth();const can=(p:string)=>user?.permissions.some(v=>v===p);
 const {data,loading,error,reload}=useResource<DashboardDto>(can("inventory:read")?"/dashboard":null);
 const logout=()=>Alert.alert("Cerrar sesión","Se cerrará el acceso en este teléfono.",[{text:"Cancelar",style:"cancel"},{text:"Cerrar sesión",onPress:()=>{session.logout().then(w=>{if(w)Alert.alert("Sesión local cerrada",w);}).catch(e=>Alert.alert("No se pudo borrar la sesión",e.message));}}]);
 return <Screen><Text style={s.label}>TU ALMACÉN, A MANO</Text><Text style={s.title}>Hola, {user?.name}</Text><Text style={s.subtitle}>Consulta un lote o registra su próximo movimiento.</Text>
 {can("inventory:read")&&<><Button title="Escanear un QR" onPress={()=>router.push("/scanner")}/><View style={s.row}><Button title="Consultar lotes" secondary onPress={()=>router.push("/inventory")}/>{can("catalog:read")&&<Button title="Repuestos" secondary onPress={()=>router.push("/products")}/>}</View></>}
 {can("inventory:write")&&<Button title="Registrar entrada o salida" secondary onPress={()=>router.push("/movement")}/>}
 <ErrorNotice message={error}/>{loading&&<Loading/>}{data&&<><View style={s.card}><Text style={s.small}>Unidades disponibles</Text><Text style={s.metric}>{data.units.toLocaleString()}</Text><Text style={s.small}>{data.products} referencias · {data.batches} lotes</Text></View><Text style={[s.text,{fontWeight:"700"}]}>Alertas de inventario</Text>{data.lowStock.length?data.lowStock.map(p=><View style={s.card} key={p.id}><Text style={s.text}>{p.name}</Text><Text style={s.small}>{p.sku} · {p.quantity} unidades · mínimo {p.minimumStock}</Text></View>):<Text style={s.small}>No hay referencias por debajo del mínimo configurado.</Text>}</>}
 <Button title="Actualizar datos" onPress={reload} secondary disabled={loading}/><Button title="Cerrar sesión" onPress={logout} secondary/></Screen>;
}
