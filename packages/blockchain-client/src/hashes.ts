import { createHash } from "node:crypto";
export type Json = null | boolean | number | string | Json[] | {[key:string]:Json};
/** Canonical format v1: UTF-8, sorted object keys, safe integers, exact strings. */
export function canonicalJson(value:Json):string {
  if(value===null || typeof value==="boolean" || typeof value==="string") return JSON.stringify(value);
  if(typeof value==="number") {
    if(!Number.isSafeInteger(value)||Object.is(value,-0)) throw new Error("Canonical numbers must be safe integers");
    return String(value);
  }
  if(Array.isArray(value)) return "["+Array.from(value,canonicalJson).join(",")+"]";
  if(typeof value!=="object"||Object.getPrototypeOf(value)!==Object.prototype) throw new Error("Unsupported canonical value");
  return "{"+Object.keys(value).sort().map(key=>JSON.stringify(key)+":"+canonicalJson(value[key]!)).join(",")+"}";
}
export const sha256=(value:string|Uint8Array)=>createHash("sha256").update(value).digest("hex");
export function payloadHash(value:Json){return sha256(canonicalJson(value));}
export function uuidBytes(value:string):Buffer {
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value))throw new Error("Invalid UUID");
  const bytes=Buffer.from(value.replaceAll("-",""),"hex");
  if(bytes.every(v=>v===0))throw new Error("Zero UUID");
  return bytes;
}
export function hashBytes(value:string):Buffer{
  if(!/^[0-9a-f]{64}$/.test(value))throw new Error("Invalid SHA-256");
  return Buffer.from(value,"hex");
}
export function u64(value:bigint):Buffer{
  if(value<0n||value>0xffffffffffffffffn)throw new Error("Invalid u64");
  const result=Buffer.alloc(8);result.writeBigUInt64LE(value);return result;
}
export function receiptHash(company:Uint8Array,batch:Uint8Array,id:Uint8Array,payload:Uint8Array,actor:Uint8Array){
  return sha256(Buffer.concat([Buffer.from("REPUCHAIN_RECEIPT_V1"),company,batch,id,payload,actor]));
}
export function eventHash(batch:Uint8Array,id:Uint8Array,sequence:bigint,kind:number,payload:Uint8Array,previous:Uint8Array,actor:Uint8Array,from:Uint8Array,to:Uint8Array){
  if(kind!==0&&kind!==1)throw new Error("Invalid event kind");
  return sha256(Buffer.concat([Buffer.from("REPUCHAIN_EVENT_V1"),batch,id,u64(sequence),Buffer.from([kind]),payload,previous,actor,from,to]));
}
