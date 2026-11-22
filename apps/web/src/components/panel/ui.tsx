"use client";
import {useEffect,useRef,type ReactNode} from "react";
const paths:Record<string,string>={
 dashboard:"M3 3h7v7H3z M14 3h7v4h-7z M14 11h7v10h-7z M3 14h7v7H3z",
 catalogo:"M4 5h16v15H4z M8 5V3h8v2 M8 10h8 M8 14h5",inventario:"m3 7 9-4 9 4-9 4z M3 7v10l9 4 9-4V7 M12 11v10",
 lotes:"M4 4h6v6H4z M14 4h6v6h-6z M4 14h6v6H4z M14 14h6v6h-6z",movimientos:"M4 7h15l-4-4 M20 17H5l4 4",
 compras:"M3 3h2l3 12h10l3-9H6 M9 20h.01 M18 20h.01",ventas:"M4 4h16v16H4z M8 9h8 M8 13h5 M12 2v4 M12 18v4",
 trazabilidad:"M8 9 6 7a3 3 0 0 1 4-4l4 4a3 3 0 0 1 0 4 M16 15l2 2a3 3 0 0 1-4 4l-4-4a3 3 0 0 1 0-4 M9 9l6 6",
 proveedores:"M3 8h12v11H3z M15 12h4l3 4v3h-7 M7 21a2 2 0 1 0 0-4 2 2 0 0 0 0 4 M18 21a2 2 0 1 0 0-4 2 2 0 0 0 0 4",
 almacenes:"m3 9 9-6 9 6v12H3z M7 21v-8h10v8 M7 17h10",usuarios:"M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M2 21v-3a7 7 0 0 1 14 0v3 M16 4a4 4 0 0 1 0 7 M18 14a6 6 0 0 1 4 7",
 auditoria:"M5 4h14v18H5z M9 4V2h6v2 M8 10h8 M8 14h8 M8 18h5",categorias:"M3 5h7l2 3h9v13H3z",marcas:"m3 3 9 0 9 9-9 9-9-9z M7 7h.01",vehiculos:"m4 9 2-5h12l2 5 M3 9h18v9H3z M5 18v3 M19 18v3 M6 13h2 M16 13h2",
 search:"M16 16 21 21 M10 17a7 7 0 1 0 0-14 7 7 0 0 0 0 14",plus:"M12 5v14 M5 12h14",close:"m6 6 12 12 M18 6 6 18",
 menu:"M4 6h16 M4 12h16 M4 18h16",refresh:"M20 8a8 8 0 1 0 0 8 M20 3v5h-5",logout:"M9 3H3v18h6 M10 12h11 M17 8l4 4-4 4",
 shield:"m12 2 8 3v7c0 5-8 10-8 10S4 17 4 12V5z M8 12l3 3 5-6",chevron:"m9 5 7 7-7 7",check:"m5 12 4 4L19 6",alert:"m12 3 10 18H2z M12 9v5 M12 17h.01",
};
export function Icon({name,size=20}:{name:string;size?:number}){return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]??paths.catalogo}/></svg>;}
export function Brand(){return <span className="brand"><span className="brand-mark"><Icon name="inventario" size={25}/></span>repu<span>chain</span><i/></span>;}
const statuses:Record<string,[string,string]>={CONFIRMED:["Confirmada","success"],PENDING:["Pendiente","warning"],PROCESSING:["En proceso","info"],FAILED:["Requiere revisión","danger"],IN:["Entrada","success"],OUT:["Salida","warning"],TRANSFER:["Transferencia","info"],true:["Activo","success"],false:["Inactivo","neutral"]};
export function Badge({value}:{value:string|boolean}){const [label,color]=statuses[String(value)]??[String(value),"neutral"];return <span className={"badge "+color}>{label}</span>;}
export function Empty({title="Todavía no hay registros",description="Los registros de tu empresa aparecerán aquí.",action}:{title?:string;description?:string;action?:ReactNode}){return <div className="empty"><span className="empty-icon"><Icon name="inventario" size={34}/></span><h3>{title}</h3><p>{description}</p>{action}</div>;}
export function Notice({children}:{children:ReactNode}){return <div className="error-notice" role="alert"><Icon name="alert"/><span>{children}</span></div>;}
export function Modal({title,children,onClose,busy=false}:{title:string;children:ReactNode;onClose:()=>void;busy?:boolean}){
 const ref=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const node=ref.current;node?.showModal();return()=>node?.close();},[]);
 return <dialog ref={ref} className="modal" aria-label={title} onCancel={e=>{e.preventDefault();if(!busy)onClose();}}><div className="modal-heading"><div><p className="eyebrow">REPUCHAIN / GESTIÓN</p><h2>{title}</h2></div><button type="button" className="icon-button" aria-label="Cerrar" disabled={busy} onClick={onClose}><Icon name="close"/></button></div>{children}</dialog>;
}
