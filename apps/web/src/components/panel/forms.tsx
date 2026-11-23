"use client";
import {useEffect,useRef,useState,type FormEvent} from "react";
import {api,allRows,ApiError,sections,money,type Row,type Section} from "../../lib/panel";
import {Modal,Notice,Icon} from "./ui";
type Field={name:string;label:string;type?:string;required?:boolean;source?:string;max?:number};
const fields:Partial<Record<Section,Field[]>>={
 catalogo:[{name:"sku",label:"SKU",required:true,max:64},{name:"name",label:"Nombre del repuesto",required:true,max:160},{name:"description",label:"Descripción",type:"textarea",max:2000},{name:"unitPrice",label:"Precio unitario",type:"decimal",required:true},{name:"minimumStock",label:"Stock mínimo",type:"number",required:true},{name:"categoryId",label:"Categoría",source:"categories"},{name:"brandId",label:"Marca",source:"brands"}],
 lotes:[{name:"code",label:"Código de lote",required:true,max:64},{name:"productId",label:"Repuesto",source:"products",required:true},{name:"supplierId",label:"Proveedor",source:"suppliers"}],
 proveedores:[{name:"code",label:"Código",required:true,max:64},{name:"name",label:"Nombre del proveedor",required:true,max:160},{name:"email",label:"Correo electrónico",type:"email",max:254},{name:"phone",label:"Teléfono",max:40}],
 almacenes:[{name:"code",label:"Código",required:true,max:64},{name:"name",label:"Nombre del almacén",required:true,max:160},{name:"address",label:"Dirección",max:500}],
 categorias:[{name:"name",label:"Nombre de la categoría",required:true,max:120}],
 marcas:[{name:"name",label:"Nombre de la marca",required:true,max:120}],
 vehiculos:[{name:"make",label:"Fabricante",required:true,max:80},{name:"model",label:"Modelo",required:true,max:80},{name:"yearFrom",label:"Desde el año",type:"number",required:true},{name:"yearTo",label:"Hasta el año",type:"number",required:true}],
 usuarios:[{name:"name",label:"Nombre",required:true,max:160},{name:"email",label:"Correo electrónico",type:"email",required:true,max:254},{name:"password",label:"Contraseña inicial (12 caracteres mínimo)",type:"password",required:true},{name:"roleId",label:"Rol",source:"roles",required:true}],
 movimientos:[{name:"batchId",label:"Lote",source:"batches",required:true},{name:"quantity",label:"Cantidad",type:"number",required:true},{name:"sourceWarehouseId",label:"Almacén de origen",source:"warehouses",required:true},{name:"destinationWarehouseId",label:"Almacén de destino",source:"warehouses",required:true},{name:"reason",label:"Motivo",type:"textarea",required:true,max:500}],
};
const label=(row:Row)=>row.product?row.code+" · "+row.product.name:row.sku?row.sku+" · "+row.name:row.name??row.code;
function useSubmit(onSaved:()=>void){
 const [busy,setBusy]=useState(false),[error,setError]=useState(""),[uncertain,setUncertain]=useState(false);
 const attempt=useRef<{body:string;key:string}|null>(null);
 async function send(path:string,data:unknown,method="POST"){
  if(busy)return;
  const current=attempt.current??{body:JSON.stringify(data),key:crypto.randomUUID()};
  attempt.current=current;setBusy(true);setError("");
  try{await api(path,{method,body:current.body,headers:{"Idempotency-Key":current.key}});attempt.current=null;onSaved();}
  catch(e){setError((e as Error).message);const ambiguous=!(e instanceof ApiError)||e.status>=500;setUncertain(ambiguous);if(!ambiguous)attempt.current=null;}
  finally{setBusy(false);}
 }
 return {send,busy,error,uncertain};
}
function useChoices(sources:string[]){
 const [choices,setChoices]=useState<Record<string,Row[]>>({}),[error,setError]=useState(""),[loading,setLoading]=useState(true);
 const key=sources.join("|");
 useEffect(()=>{let active=true;setLoading(true);Promise.all(sources.map(async s=>[s,await allRows(s)] as const)).then(p=>{if(active)setChoices(Object.fromEntries(p));}).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[key]); // Sources are determined by the form kind.
 return {choices,error,loading};
}
export function RecordForm({section,item,onClose,onSaved}:{section:Section;item?:Row;onClose:()=>void;onSaved:()=>void}){
 const [movementType,setMovementType]=useState("IN");
 const definitions=(fields[section]??[]).filter(f=>!(item&&section==="usuarios"&&["password","email"].includes(f.name)));
 const {choices,error:choiceError,loading}=useChoices([...new Set(definitions.flatMap(f=>f.source?[f.source]:[]))]);
 const submission=useSubmit(onSaved);
 const close=()=>{if(!submission.uncertain||window.confirm("El resultado de la operación no está confirmado. Si cierras, revisa el historial antes de crearla otra vez."))onClose();};
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();const raw=new FormData(event.currentTarget),data:Row={};
  for(const f of definitions){
   if(section==="movimientos"&&((f.name==="sourceWarehouseId"&&movementType==="IN")||(f.name==="destinationWarehouseId"&&movementType==="OUT")))continue;
   const v=String(raw.get(f.name)??"").trim();
   if(f.type==="number")data[f.name]=Number(v);
   else if(v)data[f.name]=v;
   else if(["categoryId","brandId","supplierId","email","phone"].includes(f.name))data[f.name]=null;
   else if(f.type!=="password")data[f.name]="";
  }
  if(section==="movimientos")data.type=movementType;
  if(item&&["catalogo","proveedores","almacenes","usuarios"].includes(section))data.active=raw.get("active")==="on";
  await submission.send(sections[section].path+(item?"/"+item.id:""),data,item?"PATCH":"POST");
 }
 return <Modal title={item?"Editar "+(item.name??"registro"):sections[section].action??"Nuevo registro"} onClose={close} busy={submission.busy}>
 <form onSubmit={submit}>{(choiceError||submission.error)&&<Notice>{choiceError||submission.error}</Notice>}{submission.uncertain&&<Notice>Conservamos los datos y la clave de esta operación. Pulsa Reintentar para comprobar el mismo envío.</Notice>}
 {loading?<p className="muted">Cargando opciones…</p>:<fieldset disabled={submission.busy||submission.uncertain}><div className="form-grid">
 {section==="movimientos"&&<label className="full">Tipo de movimiento<select name="type" value={movementType} onChange={e=>setMovementType(e.target.value)}><option value="IN">Entrada</option><option value="OUT">Salida</option><option value="TRANSFER">Transferencia</option></select></label>}
 {definitions.filter(f=>!(section==="movimientos"&&((f.name==="sourceWarehouseId"&&movementType==="IN")||(f.name==="destinationWarehouseId"&&movementType==="OUT")))).map(f=><label key={f.name} className={f.type==="textarea"?"full":""}>{f.label}{f.required&&<span className="required"> *</span>}
 {f.source?<select name={f.name} required={f.required} defaultValue={item?.[f.name]??(f.name==="roleId"?item?.role?.id:undefined)??""}><option value="">Seleccionar…</option>{(choices[f.source]??[]).filter(r=>r.active!==false||r.id===item?.[f.name]).map(r=><option key={r.id} value={r.id}>{label(r)}</option>)}</select>
 :f.type==="textarea"?<textarea name={f.name} required={f.required} maxLength={f.max} minLength={f.name==="reason"?3:undefined} defaultValue={item?.[f.name]??""} rows={3}/>
 :<input name={f.name} type={f.type==="decimal"?"text":f.type??"text"} inputMode={f.type==="decimal"?"decimal":undefined} pattern={f.type==="decimal"?"[0-9]+([.][0-9]{1,2})?":undefined} required={f.required} min={f.name.startsWith("year")?1886:f.name==="quantity"?1:0} max={f.name.startsWith("year")?2200:f.type==="number"?2147483647:undefined} step={f.type==="number"?1:undefined} maxLength={f.max} minLength={f.type==="password"?12:undefined} autoComplete={f.type==="password"?"new-password":"off"} defaultValue={item?.[f.name]??(f.name==="unitPrice"||f.name==="minimumStock"?"0":f.name==="quantity"?"1":"")}/>}
 </label>)}
 {item&&["catalogo","proveedores","almacenes","usuarios"].includes(section)&&<label className="checkbox full"><input type="checkbox" name="active" defaultChecked={item.active!==false}/> Registro activo</label>}
 </div></fieldset>}
 <div className="modal-actions"><button type="button" className="button secondary" onClick={close} disabled={submission.busy}>Cancelar</button><button className="button primary" disabled={submission.busy||loading||!!choiceError}>{submission.busy?"Guardando…":submission.uncertain?"Reintentar":"Guardar registro"}</button></div>
 </form></Modal>;
}
export function TradeForm({section,currency,onClose,onSaved}:{section:"compras"|"ventas";currency:string;onClose:()=>void;onSaved:()=>void}){
 const purchase=section==="compras";
 const {choices,loading,error}=useChoices(purchase?["batches","warehouses","suppliers"]:["batches","warehouses"]);
 const [lines,setLines]=useState([{batchId:"",quantity:"1",unitPrice:"0"}]);
 const submission=useSubmit(onSaved);
 function update(index:number,field:string,value:string){setLines(rows=>rows.map((row,i)=>i===index?{...row,[field]:value,...(field==="batchId"&&!purchase?{unitPrice:String(choices.batches?.find(b=>b.id===value)?.product?.unitPrice??0)}:{})}:row));}
 let cents=0n;for(const line of lines){if(/^\d+(\.\d{1,2})?$/.test(line.unitPrice)&&/^\d+$/.test(line.quantity)){const [a,b=""]=line.unitPrice.split(".");cents+=(BigInt(a!)*100n+BigInt(b.padEnd(2,"0")))*BigInt(line.quantity);}}
 const total=(cents/100n).toString()+"."+(cents%100n).toString().padStart(2,"0");
 const close=()=>{if(!submission.uncertain||window.confirm("El envío no está confirmado. Revisa el historial antes de repetir esta operación."))onClose();};
 async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();const form=new FormData(e.currentTarget);await submission.send(purchase?"purchases":"sales",{reference:form.get("reference"),warehouseId:form.get("warehouseId"),...(purchase?{supplierId:form.get("supplierId")}:{counterparty:form.get("counterparty")}),lines:lines.map(l=>({...l,quantity:Number(l.quantity)}))});}
 return <Modal title={purchase?"Registrar compra":"Registrar venta"} onClose={close} busy={submission.busy}><form onSubmit={submit}>
 {(error||submission.error)&&<Notice>{error||submission.error}</Notice>}{submission.uncertain&&<Notice>Reintenta el mismo envío para evitar duplicados.</Notice>}
 {loading?<p>Cargando lotes y almacenes…</p>:<fieldset disabled={submission.busy||submission.uncertain}><div className="form-grid">
 <label>Referencia del documento<input name="reference" required maxLength={64} placeholder={purchase?"COMPRA-0001":"VENTA-0001"}/></label>
 <label>Almacén<select name="warehouseId" required><option value="">Seleccionar…</option>{choices.warehouses?.filter(w=>w.active).map(w=><option key={w.id} value={w.id}>{w.name}</option>)}</select></label>
 {purchase?<label className="full">Proveedor<select name="supplierId" required><option value="">Seleccionar…</option>{choices.suppliers?.filter(s=>s.active).map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>:<label className="full">Cliente<input name="counterparty" required maxLength={160} placeholder="Nombre del cliente"/></label>}</div>
 <div className="line-heading"><h3>Repuestos del documento</h3><span className="muted small">Hasta 20 lotes</span></div>
 {lines.map((line,index)=><div className="trade-line" key={index}><label>Lote<select aria-label={"Lote "+(index+1)} required value={line.batchId} onChange={e=>update(index,"batchId",e.target.value)}><option value="">Seleccionar lote…</option>{choices.batches?.filter(b=>!purchase||b.product?.active).map(b=><option key={b.id} value={b.id} disabled={lines.some((l,i)=>i!==index&&l.batchId===b.id)}>{label(b)}</option>)}</select></label><label>Cantidad<input aria-label={"Cantidad "+(index+1)} type="number" required min={1} max={2147483647} step={1} value={line.quantity} onChange={e=>update(index,"quantity",e.target.value)}/></label><label>{purchase?"Costo unitario":"Precio unitario"}<input aria-label={"Precio "+(index+1)} required inputMode="decimal" pattern="[0-9]+([.][0-9]{1,2})?" value={line.unitPrice} onChange={e=>update(index,"unitPrice",e.target.value)}/></label><button type="button" className="icon-button remove-line" aria-label={"Quitar línea "+(index+1)} disabled={lines.length===1} onClick={()=>setLines(rows=>rows.filter((_,i)=>i!==index))}><Icon name="close"/></button></div>)}
 <button type="button" className="button secondary" disabled={lines.length>=20} onClick={()=>setLines(rows=>[...rows,{batchId:"",quantity:"1",unitPrice:"0"}])}><Icon name="plus"/> Añadir lote</button>
 <div className="trade-total"><span>Total del documento</span><strong>{money(total,currency)}</strong></div><p className="small muted">Al registrar se {purchase?"sumará":"descontará"} el stock. El documento y sus movimientos quedarán en el historial y no se podrán editar.</p></fieldset>}
 <div className="modal-actions"><button type="button" className="button secondary" onClick={close} disabled={submission.busy}>Cancelar</button><button className="button primary" disabled={submission.busy||loading||!!error}>{submission.busy?"Registrando…":submission.uncertain?"Reintentar":purchase?"Registrar y recibir":"Registrar venta"}</button></div></form></Modal>;
}
export function Compatibility({product,onClose,canWrite}:{product:Row;onClose:()=>void;canWrite:boolean}){
 const [items,setItems]=useState<Row[]>([]),[vehicles,setVehicles]=useState<Row[]>([]),[error,setError]=useState(""),[busy,setBusy]=useState(false);
 const load=()=>api("products/"+product.id+"/compatibilities").then(setItems);
 useEffect(()=>{Promise.all([load(),allRows("vehicles").then(setVehicles)]).catch(e=>setError(e.message));},[product.id]);
 async function save(e:FormEvent<HTMLFormElement>){e.preventDefault();setBusy(true);setError("");try{await api("products/"+product.id+"/compatibilities",{method:"POST",body:JSON.stringify({vehicleModelId:new FormData(e.currentTarget).get("vehicleModelId")})});await load();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 return <Modal title={"Compatibilidad · "+product.name} onClose={onClose} busy={busy}>{error&&<Notice>{error}</Notice>}<ul className="compat-list">{items.map(r=><li key={r.vehicleModelId}>{r.vehicle.make} {r.vehicle.model}<span>{r.vehicle.yearFrom}–{r.vehicle.yearTo}</span></li>)}</ul>{!items.length&&<p className="muted">Sin vehículos vinculados.</p>}{canWrite&&<form onSubmit={save}><label>Vincular vehículo<select name="vehicleModelId" required><option value="">Seleccionar…</option>{vehicles.filter(v=>!items.some(i=>i.vehicleModelId===v.id)).map(v=><option key={v.id} value={v.id}>{v.make} {v.model} · {v.yearFrom}–{v.yearTo}</option>)}</select></label><div className="modal-actions"><button className="button primary" disabled={busy}>Vincular</button></div></form>}</Modal>;
}
