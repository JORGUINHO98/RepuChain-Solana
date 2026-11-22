"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {api,date,money,type Row,type Section} from "../../lib/panel";
import {Badge,Modal,Notice} from "./ui";
import {QrLabel} from "./qr-label";
export function Detail({section,item,currency,canRetry,onClose,onChanged}:{section:Section;item:Row;currency:string;canRetry:boolean;onClose:()=>void;onChanged:()=>void}){
 const [detail,setDetail]=useState<Row>(item),[loading,setLoading]=useState(section==="trazabilidad"),[error,setError]=useState(""),[busy,setBusy]=useState(false);
 useEffect(()=>{let active=true;if(section==="trazabilidad")api("blockchain/evidence/"+item.id).then(d=>{if(active)setDetail(d);}).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[item.id,section]);
 async function retry(){setBusy(true);setError("");try{await api("blockchain/evidence/"+item.id+"/retry",{method:"POST",body:"{}"});setDetail(await api("blockchain/evidence/"+item.id));onChanged();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 return <Modal title={detail.reference??(section==="trazabilidad"?"Detalle de evidencia":"Detalle del registro")} onClose={onClose} busy={busy}>
 {error&&<Notice>{error}</Notice>}{loading?<p>Cargando evidencia…</p>:section==="trazabilidad"?<><div className="detail-status"><Badge value={detail.status}/><span className="muted">{detail.blockchain?.network==="devnet"?"Solana Devnet":detail.blockchain?.network==="localnet"?"Red local":"Pendiente de vinculación"}</span></div>
 <dl className="detail-list"><dt>Evento</dt><dd>{detail.sequence===0?"Recepción del lote":"Movimiento · secuencia "+detail.sequence}</dd><dt>Registro</dt><dd>{date(detail.createdAt)}</dd><dt>Hash del contenido</dt><dd><code>{detail.payloadHash}</code></dd><dt>Hash de evidencia</dt><dd><code>{detail.evidenceHash??"Todavía no confirmado"}</code></dd><dt>Firma</dt><dd><code>{detail.signature??"Sin firma confirmada"}</code></dd><dt>Intentos</dt><dd>{detail.attempts}</dd></dl>
 {detail.status==="CONFIRMED"&&detail.signature&&detail.blockchain?.network==="devnet"&&<a className="button secondary" href={"https://explorer.solana.com/tx/"+encodeURIComponent(detail.signature)+"?cluster=devnet"} target="_blank" rel="noreferrer">Abrir transacción en Solana Explorer</a>}
 {detail.status!=="CONFIRMED"&&<p className="small muted">La evidencia solo se marca confirmada después de comprobar la transacción y el contenido de su cuenta en Solana.</p>}
 {detail.status==="FAILED"&&<Notice>El envío requiere revisión: {detail.lastError}. {canRetry?"Puedes solicitar otro intento.":"Contacta con el administrador."}</Notice>}
 {detail.status==="FAILED"&&canRetry&&<button className="button primary" disabled={busy} onClick={retry}>Reintentar evidencia</button>}
 <details className="payload"><summary>Contenido canónico registrado</summary><pre>{detail.canonicalPayload?JSON.stringify(JSON.parse(detail.canonicalPayload),null,2):"No disponible"}</pre></details></>
 :section==="lotes"?<QrLabel batch={item}/>:detail.lines?<><dl className="detail-list"><dt>{section==="compras"?"Proveedor":"Cliente"}</dt><dd>{detail.counterparty}</dd><dt>Almacén</dt><dd>{detail.warehouse.name}</dd><dt>Fecha</dt><dd>{date(detail.createdAt)}</dd></dl><div className="table-wrap"><table><thead><tr><th>Lote / repuesto</th><th>Cantidad</th><th>Precio</th><th>Subtotal</th></tr></thead><tbody>{detail.lines.map((line:Row)=><tr key={line.id}><td><Link className="text-link" href={"/trazabilidad?batch="+line.batchId}>{line.batch.code}</Link><small>{line.batch.product.name}</small></td><td>{line.quantity}</td><td>{money(line.unitPrice,currency)}</td><td>{money(line.total,currency)}</td></tr>)}</tbody></table></div><div className="trade-total"><span>Total</span><strong>{money(detail.total,currency)}</strong></div><p className="small muted">Documento registrado. Sus movimientos forman parte del historial de inventario.</p></>
 :<pre className="json-detail">{JSON.stringify(detail,null,2)}</pre>}</Modal>;
}
