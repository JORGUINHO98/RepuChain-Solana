import {useState} from "react";
import {Modal,View,Text,ScrollView,Pressable,TextInput} from "react-native";
import {SafeAreaView} from "react-native-safe-area-context";
import {Button,s} from "./ui";
export function Choice({label,value,items,onChange,disabled=false}:{label:string;value:string;items:{id:string;label:string}[];onChange:(v:string)=>void;disabled?:boolean}){
 const [open,setOpen]=useState(false),[query,setQuery]=useState("");
 return <View style={{gap:8}}><Text style={s.small}>{label}</Text><Button title={items.find(r=>r.id===value)?.label??(value?"Lote "+value:"Seleccionar…")} secondary disabled={disabled} onPress={()=>{setQuery("");setOpen(true);}}/><Modal visible={open} animationType="slide" onRequestClose={()=>setOpen(false)}><SafeAreaView style={s.screen}><View style={[s.content,{flex:1}]}><Text style={s.title}>{label}</Text><TextInput accessibilityLabel={"Buscar "+label} placeholder="Buscar…" placeholderTextColor="#8294b0" value={query} onChangeText={setQuery} style={s.input}/><ScrollView keyboardShouldPersistTaps="handled">{items.filter(r=>r.label.toLowerCase().includes(query.toLowerCase())).map(row=><Pressable key={row.id} accessibilityRole="button" onPress={()=>{onChange(row.id);setOpen(false);}} style={[s.card,{marginBottom:10},value===row.id&&s.selected]}><Text style={s.text}>{row.label}</Text></Pressable>)}</ScrollView><Button title="Cerrar selección" secondary onPress={()=>setOpen(false)}/></View></SafeAreaView></Modal></View>;
}
