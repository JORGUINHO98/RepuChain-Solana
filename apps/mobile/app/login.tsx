import {Text,Linking} from "react-native";
import {Redirect} from "expo-router";
import {useAuth} from "../src/modules/auth/provider";
import {Screen,Button,Loading,s} from "../src/components/ui";
export default function Login(){
 const {user,ready}=useAuth();if(!ready)return <Screen><Loading/></Screen>;if(user)return <Redirect href="/home"/>;
 const web=process.env.EXPO_PUBLIC_WEB_URL;
 return <Screen><Text style={s.label}>REPUCHAIN / SOLANA</Text><Text style={s.title}>Acceso con wallet</Text><Text style={s.subtitle}>El acceso por correo se ha retirado. Usa la versión web desde un navegador compatible con tu wallet Solana.</Text><Text style={s.small}>El acceso nativo por wallet todavía no está disponible. Iniciar sesión en la web no inicia una sesión en esta aplicación.</Text>{web&&<Button title="Abrir RepuChain web" onPress={()=>{void Linking.openURL(web);}}/>}</Screen>;
}
