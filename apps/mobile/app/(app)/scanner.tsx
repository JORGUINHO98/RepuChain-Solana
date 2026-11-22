import {useCallback,useEffect,useRef,useState} from "react";
import {AppState,Linking,Text,View} from "react-native";
import {CameraView,useCameraPermissions} from "expo-camera";
import {router,useFocusEffect} from "expo-router";
import {parseBatchQr} from "@repuchain/utils";
import {useAuth} from "../../src/modules/auth/provider";
import {Screen,Button,ErrorNotice,Field,s} from "../../src/components/ui";
export default function Scanner(){
 const {user}=useAuth();const [permission,requestPermission]=useCameraPermissions();
 const [focused,setFocused]=useState(false),[foreground,setForeground]=useState(AppState.currentState==="active"),[error,setError]=useState(""),[manual,setManual]=useState(""),[paused,setPaused]=useState(false),[torch,setTorch]=useState(false);
 const lock=useRef(false);
 useFocusEffect(useCallback(()=>{setFocused(true);lock.current=false;setPaused(false);return()=>setFocused(false);},[]));
 useEffect(()=>{const listener=AppState.addEventListener("change",state=>setForeground(state==="active"));return()=>listener.remove();},[]);
 function scan(value:string){if(lock.current)return;lock.current=true;setPaused(true);setError("");try{const qr=parseBatchQr(value);if(qr.companyId!==user?.companyId.toLowerCase())throw new Error("Este QR pertenece a otra empresa. Inicia sesión en la empresa correspondiente.");router.push({pathname:"/batch/[id]",params:{id:qr.batchId}});}catch(e){setError((e as Error).message);}}
 const resume=()=>{lock.current=false;setPaused(false);setError("");};
 return <Screen><Text style={s.title}>Encuentra el lote</Text><Text style={s.subtitle}>Apunta al QR de RepuChain. Escanear no modifica las existencias.</Text>
 {!user?.permissions.includes("inventory:read")?<ErrorNotice message="No tienes permiso para consultar inventario."/>:<>
 {permission?.granted?focused&&foreground&&!paused?<View style={{height:300,borderRadius:16,overflow:"hidden"}}><CameraView style={{flex:1}} facing="back" enableTorch={torch} barcodeScannerSettings={{barcodeTypes:["qr"]}} onBarcodeScanned={({data})=>scan(data)} onMountError={()=>{lock.current=true;setPaused(true);setError("No se pudo iniciar la cámara. Puedes consultar el lote manualmente.");}}/></View>:<View style={s.card}><Text style={s.small}>Cámara en pausa.</Text></View>:<View style={s.card}><Text style={s.text}>Permite el acceso a la cámara</Text><Text style={s.small}>Se utiliza para leer QR. No se guardan fotografías ni se graba audio.</Text><Button title={permission?.canAskAgain===false?"Abrir ajustes":"Permitir cámara"} onPress={()=>{(permission?.canAskAgain===false?Linking.openSettings():requestPermission()).catch(()=>setError("No se pudo solicitar el permiso."));}}/></View>}
 <ErrorNotice message={error}/>{paused&&<Button title="Escanear otro QR" onPress={resume}/>}
 {permission?.granted&&!paused&&<Button title={torch?"Apagar linterna":"Encender linterna"} secondary onPress={()=>setTorch(v=>!v)}/>}
 <Field label="O pega el contenido de un QR RepuChain" value={manual} onChangeText={setManual} autoCapitalize="none" maxLength={240}/><Button title="Consultar QR pegado" secondary disabled={!manual.trim()} onPress={()=>{lock.current=false;scan(manual);}}/><Button title="Buscar lote por código" secondary onPress={()=>router.push("/inventory")}/></>}</Screen>;
}
