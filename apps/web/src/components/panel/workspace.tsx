"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {api,sections,type Section,type Row,type User} from "../../lib/panel";
import {Brand,Icon,Notice,Empty} from "./ui";
import {Login} from "./login";
import {Dashboard} from "./dashboard";
import {DataTable} from "./table";
import {RecordForm,TradeForm,Compatibility} from "./forms";
import {Detail} from "./detail";
export function Workspace({section}:{section:Section}){
 const [user,setUser]=useState<User|null>(null),[checking,setChecking]=useState(true),[expired,setExpired]=useState(false),[authError,setAuthError]=useState("");
 const [company,setCompany]=useState<Row>({}),[data,setData]=useState<Row|null>(null),[error,setError]=useState(""),[loading,setLoading]=useState(false);
 const [page,setPage]=useState(1),[search,setSearch]=useState(""),[batch,setBatch]=useState(""),[revision,setRevision]=useState(0),[mobile,setMobile]=useState(false);
 const [form,setForm]=useState<{section:Section;item?:Row}|null>(null),[detail,setDetail]=useState<Row|null>(null),[compat,setCompat]=useState<Row|null>(null),[toast,setToast]=useState("");
 const info=sections[section],can=(p?:string)=>!!p&&!!user?.permissions.includes(p),currency=company.currency??"BOB";
 async function session(){setChecking(true);setAuthError("");try{const r=await fetch("/api/session",{cache:"no-store"});if(r.ok){setUser(await r.json());setExpired(false);}else if(r.status!==401)throw new Error("No se pudo consultar la sesión.");}catch(e){setAuthError((e as Error).message);}finally{setChecking(false);}}
 useEffect(()=>{session();const end=()=>{setUser(null);setData(null);setForm(null);setDetail(null);setCompat(null);setExpired(true);};window.addEventListener("session-expired",end);return()=>window.removeEventListener("session-expired",end);},[]);
 useEffect(()=>{if(user)api("companies/me").then(setCompany).catch(e=>setError(e.message));},[user]);
 useEffect(()=>{setBatch(new URLSearchParams(window.location.search).get("batch")??"");},[section]);
 useEffect(()=>{if(!user||!user.permissions.includes(info.read))return;let active=true;setLoading(true);setError("");const q=new URLSearchParams({page:String(page),limit:"20"});if(search.trim())q.set("search",search.trim());if(batch)q.set("batchId",batch);api(info.path+(section==="dashboard"?"":"?"+q)).then(d=>{if(active)setData(Array.isArray(d)?{items:d,total:d.length}:d);}).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[user,section,page,search,batch,revision,info.path,info.read]);
 function saved(){setForm(null);setToast("Registro guardado correctamente.");setRevision(r=>r+1);}
 async function logout(){try{await api("/api/session",{method:"DELETE"});}catch{}setUser(null);setData(null);setCompany({});}
 if(checking)return <main className="session-loading"><Brand/><p>Comprobando acceso…</p></main>;
 if(!user)return <>{authError&&<Notice>{authError} <button onClick={session}>Reintentar</button></Notice>}<Login onSuccess={session} expired={expired}/></>;
 return <div className="workspace">{mobile&&<button className="nav-overlay" aria-label="Cerrar navegación" onClick={()=>setMobile(false)}/>}<aside className={"sidebar "+(mobile?"open":"")}><Link href="/" aria-label="RepuChain, inicio"><Brand/></Link><div className="company-label"><span className="company-avatar">{String(company.name??"R").slice(0,1)}</span><div><strong>{company.name??"Mi empresa"}</strong><small>Espacio de trabajo</small></div></div><nav aria-label="Navegación principal">{["OPERACIÓN","COMERCIAL","CONTROL","DIRECTORIO"].map(group=><div className="nav-group" key={group}><p>{group}</p>{Object.entries(sections).filter(([,s])=>s.group===group&&can(s.read)).map(([key,s])=><Link href={key==="dashboard"?"/":"/"+key} key={key} aria-current={key===section?"page":undefined} onClick={()=>setMobile(false)}><Icon name={key}/><span>{s.title}</span></Link>)}</div>)}</nav><div className="sidebar-footer"><Icon name="shield" size={16}/> Trazabilidad verificable</div></aside>
 <div className="main-shell"><header className="topbar"><button className="icon-button mobile-menu" aria-label="Abrir navegación" aria-expanded={mobile} onClick={()=>setMobile(!mobile)}><Icon name="menu"/></button><span className="breadcrumb">Mi espacio <Icon name="chevron" size={14}/> <strong>{info.title}</strong></span><div className="user-menu"><span className="avatar">{user.name?.slice(0,1)}</span><span><strong>{user.name}</strong><small>{typeof user.role==="string"?user.role:"Equipo"}</small></span><button className="icon-button" title="Cerrar sesión" aria-label="Cerrar sesión" onClick={logout}><Icon name="logout"/></button></div></header>
 <main className="content"><div className="page-heading"><div><p className="eyebrow">REPUCHAIN / {info.group}</p><h1>{info.title}</h1><p>{info.description}</p></div><div className="heading-actions"><button className="icon-button" aria-label="Actualizar datos" disabled={loading} onClick={()=>setRevision(r=>r+1)}><Icon name="refresh"/></button>{can(info.write)&&<button className="button primary" onClick={()=>setForm({section})}><Icon name="plus"/>{info.action}</button>}</div></div>
 {toast&&<div className="toast" role="status">{toast}<button className="icon-button" aria-label="Cerrar aviso" onClick={()=>setToast("")}><Icon name="close" size={16}/></button></div>}
 {!can(info.read)?<Notice>Tu rol no tiene acceso a este módulo.</Notice>:<>{error&&<Notice>{error} <button className="text-link" onClick={()=>setRevision(r=>r+1)}>Reintentar</button></Notice>}
 {section!=="dashboard"&&<div className="toolbar">{section!=="trazabilidad"&&<label className="search-field"><Icon name="search"/><input aria-label="Buscar registros" placeholder="Buscar registros…" value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}}/></label>}{batch&&<button className="button secondary" onClick={()=>{setBatch("");setPage(1);}}>Quitar filtro de lote</button>}<span className="muted small">{data?.total??0} registros</span></div>}
 {loading?<div className="loading-state" role="status">Cargando datos…</div>:!error&&data&&(section==="dashboard"?<Dashboard data={data} canWrite={can("inventory:write")} onMovement={()=>setForm({section:"movimientos"})}/>:<section className="card records-card">{data.items?.length?<DataTable section={section} rows={data.items} currency={currency} canWrite={can(info.write)} onEdit={item=>setForm({section,item})} onDetail={setDetail} onCompatibility={setCompat}/>:<Empty description={search?"No hay registros que coincidan con la búsqueda.":"Los registros de tu empresa aparecerán aquí."}/>}<div className="pagination"><span>Página {page}</span><div><button className="button secondary" disabled={page===1} onClick={()=>setPage(p=>p-1)}>Anterior</button><button className="button secondary" disabled={page*20>=(data.total??0)} onClick={()=>setPage(p=>p+1)}>Siguiente</button></div></div></section>)}</>}
 </main></div>
 {form&&(form.section==="compras"||form.section==="ventas"?<TradeForm section={form.section} currency={currency} onClose={()=>setForm(null)} onSaved={saved}/>:<RecordForm section={form.section} item={form.item} onClose={()=>setForm(null)} onSaved={saved}/>)}
 {compat&&<Compatibility product={compat} canWrite={can("catalog:write")} onClose={()=>setCompat(null)}/>}
 {detail&&<Detail section={section} item={detail} currency={currency} canRetry={can("users:manage")} onClose={()=>setDetail(null)} onChanged={()=>setRevision(r=>r+1)}/>}
 </div>;
}
