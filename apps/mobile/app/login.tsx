import {useState} from "react";
import {Text,View,KeyboardAvoidingView,Platform} from "react-native";
import {Redirect} from "expo-router";
import {session} from "../src/services/api";
import {useAuth} from "../src/modules/auth/provider";
import {Screen,Field,Button,ErrorNotice,Loading,s} from "../src/components/ui";
export default function Login(){
 const auth=useAuth();const [company,setCompany]=useState("demo"),[email,setEmail]=useState(""),[password,setPassword]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState("");
 if(!auth.ready)return <Screen><Loading/></Screen>;if(auth.user)return <Redirect href="/home"/>;
 async function login(){if(busy)return;setBusy(true);setError("");try{await session.login(company.trim(),email.trim(),password);setPassword("");}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 return <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==="ios"?"padding":undefined}><Screen><View style={{paddingTop:48,gap:18}}><Text style={s.label}>REPUCHAIN / MÓVIL</Text><Text style={s.title}>Cada pieza,\nsu recorrido.</Text><Text style={s.subtitle}>Consulta tus repuestos y registra movimientos desde el almacén.</Text></View><ErrorNotice message={error||auth.error}/><Field label="Empresa" value={company} onChangeText={setCompany} autoCapitalize="none" editable={!busy}/><Field label="Correo electrónico" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="username" editable={!busy}/><Field label="Contraseña" value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" editable={!busy}/><Button title={busy?"Iniciando sesión…":"Entrar"} onPress={login} disabled={busy||!company.trim()||!email.trim()||!password}/>{auth.error&&<Button title="Recuperar sesión guardada" secondary onPress={auth.retry}/>}<Text style={s.small}>El acceso depende de los permisos asignados en tu empresa. La sesión se guarda en el almacenamiento seguro del teléfono.</Text></Screen></KeyboardAvoidingView>;
}
