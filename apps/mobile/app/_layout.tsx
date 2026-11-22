import {Stack} from "expo-router";
import {StatusBar} from "expo-status-bar";
import {AuthProvider} from "../src/modules/auth/provider";
import {colors} from "../src/components/ui";
export default function Layout(){return <AuthProvider><StatusBar style="light"/><Stack screenOptions={{headerStyle:{backgroundColor:colors.bg},headerTintColor:colors.text,contentStyle:{backgroundColor:colors.bg}}}><Stack.Screen name="index" options={{headerShown:false}}/><Stack.Screen name="login" options={{headerShown:false}}/><Stack.Screen name="(app)" options={{headerShown:false}}/></Stack></AuthProvider>;}
