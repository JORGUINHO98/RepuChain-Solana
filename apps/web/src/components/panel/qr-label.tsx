"use client";
import {useEffect,useState} from "react";
import {api,type Row} from "../../lib/panel";
import {Notice} from "./ui";
export function QrLabel({batch}:{batch:Row}){
 const [data,setData]=useState<{svg:string;payload:string}|null>(null),[error,setError]=useState("");
 useEffect(()=>{let active=true;api("batches/"+batch.id+"/qr").then(v=>{if(active)setData(v);}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[batch.id]);
 return <div style={{textAlign:"center"}}>{error&&<Notice>{error}</Notice>}<h3>{batch.code}</h3><p>{batch.product?.name}</p>{data?<><img src={"data:image/svg+xml;charset=utf-8,"+encodeURIComponent(data.svg)} width={280} height={280} alt={"Código QR del lote "+batch.code} style={{maxWidth:"100%",height:"auto"}}/><p><a className="button primary" href={"data:image/svg+xml;charset=utf-8,"+encodeURIComponent(data.svg)} download={"repuchain-"+batch.code+".svg"}>Descargar etiqueta QR</a></p><p className="small muted">Escanea con RepuChain móvil. Consultar el lote requiere acceso a su empresa. El QR identifica el lote; no acredita por sí solo su autenticidad.</p><details><summary>Contenido del QR</summary><pre>{data.payload}</pre></details></>:!error&&<p>Cargando etiqueta…</p>}</div>;
}
