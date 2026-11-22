import {Redirect} from "expo-router";
import {useAuth} from "../src/modules/auth/provider";
import {Loading,Screen} from "../src/components/ui";
export default function Index(){const {user,ready}=useAuth();if(!ready)return <Screen><Loading/></Screen>;return <Redirect href={user?"/home":"/login"}/>;}
