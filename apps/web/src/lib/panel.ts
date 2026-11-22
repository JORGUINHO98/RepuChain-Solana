export type Section="dashboard"|"catalogo"|"inventario"|"lotes"|"movimientos"|"compras"|"ventas"|"trazabilidad"|"proveedores"|"almacenes"|"categorias"|"marcas"|"vehiculos"|"usuarios"|"auditoria";
export interface SectionInfo{title:string;description:string;path:string;read:string;write?:string;action?:string;group:string}
export const sections:Record<Section,SectionInfo>={
 dashboard:{title:"Vista general",description:"Tu operación, de un vistazo.",path:"dashboard",read:"inventory:read",group:"OPERACIÓN"},
 catalogo:{title:"Catálogo de repuestos",description:"Cada referencia, lista para encontrarla.",path:"products",read:"catalog:read",write:"catalog:write",action:"Nuevo repuesto",group:"OPERACIÓN"},
 inventario:{title:"Inventario",description:"Existencias reales por almacén y lote.",path:"inventory",read:"inventory:read",group:"OPERACIÓN"},
 lotes:{title:"Lotes",description:"El punto de partida de cada historia.",path:"batches",read:"inventory:read",write:"inventory:write",action:"Nuevo lote",group:"OPERACIÓN"},
 movimientos:{title:"Movimientos",description:"Entradas, salidas y transferencias con historial.",path:"movements",read:"inventory:read",write:"inventory:write",action:"Registrar movimiento",group:"OPERACIÓN"},
 compras:{title:"Compras y recepción",description:"Registra tus compras y recibe el stock.",path:"purchases",read:"purchases:read",write:"purchases:write",action:"Registrar compra",group:"COMERCIAL"},
 ventas:{title:"Ventas",description:"Cada venta conectada con su salida de inventario.",path:"sales",read:"sales:read",write:"sales:write",action:"Registrar venta",group:"COMERCIAL"},
 trazabilidad:{title:"Trazabilidad",description:"Del registro de inventario a su evidencia en Solana.",path:"blockchain/evidence",read:"inventory:read",group:"CONTROL"},
 proveedores:{title:"Proveedores",description:"Tus aliados para mantener el inventario al día.",path:"suppliers",read:"suppliers:read",write:"suppliers:write",action:"Nuevo proveedor",group:"DIRECTORIO"},
 almacenes:{title:"Almacenes",description:"Organiza los puntos de almacenamiento.",path:"warehouses",read:"warehouses:read",write:"warehouses:write",action:"Nuevo almacén",group:"DIRECTORIO"},
 categorias:{title:"Categorías",description:"Agrupa las referencias de tu catálogo.",path:"categories",read:"catalog:read",write:"catalog:write",action:"Nueva categoría",group:"DIRECTORIO"},
 marcas:{title:"Marcas",description:"Fabricantes y marcas de tus repuestos.",path:"brands",read:"catalog:read",write:"catalog:write",action:"Nueva marca",group:"DIRECTORIO"},
 vehiculos:{title:"Compatibilidad vehicular",description:"Modelos y años para vincular a tus repuestos.",path:"vehicles",read:"catalog:read",write:"catalog:write",action:"Nuevo vehículo",group:"DIRECTORIO"},
 usuarios:{title:"Equipo y permisos",description:"Accesos separados por rol y empresa.",path:"users",read:"users:manage",write:"users:manage",action:"Nuevo usuario",group:"CONTROL"},
 auditoria:{title:"Auditoría",description:"Registro de las operaciones realizadas por tu equipo.",path:"audit",read:"audit:read",group:"CONTROL"},
};
export type Row=Record<string,any>;
export type User={id:string;companyId:string;name:string;email:string;role:string;permissions:string[]};
export class ApiError extends Error{constructor(message:string,readonly status:number){super(message);}}
export async function api<T=any>(path:string,options:RequestInit={}):Promise<T>{
 const response=await fetch(path.startsWith("/api/")?path:"/api/backend/"+path,{...options,cache:"no-store",headers:{"Content-Type":"application/json",...options.headers}});
 const data=await response.json();
 if(!response.ok){if(response.status===401)window.dispatchEvent(new Event("session-expired"));throw new ApiError(Array.isArray(data.message)?data.message.join(". "):data.message??"No se pudo completar la operación",response.status);}
 return data;
}
export async function allRows(path:string):Promise<Row[]>{
 let result:Row[]=[];
 for(let page=1;;page++){const data=await api(path+"?limit=100&page="+page);if(Array.isArray(data))return data;result=result.concat(data.items);if(result.length>=data.total||!data.items.length)return result;}
}
export const number=(v:number|string)=>new Intl.NumberFormat("es-BO").format(Number(v));
export function money(v:string|number,currency="BOB"){const [integer,decimal=""]=String(v).split(".");return currency+" "+BigInt(integer||"0").toLocaleString("es-BO")+","+decimal.padEnd(2,"0").slice(0,2);}
export const date=(v:string)=>new Intl.DateTimeFormat("es-BO",{dateStyle:"medium",timeStyle:"short"}).format(new Date(v));
export const short=(v:string)=>v?v.slice(0,6)+"…"+v.slice(-5):"—";
export const movementName=(v:string)=>({IN:"Entrada",OUT:"Salida",TRANSFER:"Transferencia"}[v]??v);
