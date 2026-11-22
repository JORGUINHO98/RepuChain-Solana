import { address, getAddressEncoder, getAddressDecoder, getProgramDerivedAddress, AccountRole, type Address, type Instruction } from "@solana/kit";
import { createHash } from "node:crypto";
import { uuidBytes,hashBytes,u64 } from "./hashes";
export const PROGRAM_ID=address("3hgkgx5V7UgU1Dac8R6ZCx2ZYs1PeHPUphFgRmG52GWv");
export const SYSTEM_PROGRAM=address("11111111111111111111111111111111");
export const DEVNET_GENESIS="EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG";
export const addressBytes=(value:string)=>Buffer.from(getAddressEncoder().encode(address(value)));
export const addressFromBytes=(value:Uint8Array)=>getAddressDecoder().decode(value);
export const discriminator=(namespace:string,name:string)=>createHash("sha256").update(namespace+":"+name).digest().subarray(0,8);
async function pda(seed:string,...values:Uint8Array[]):Promise<Address>{
  return (await getProgramDerivedAddress({programAddress:PROGRAM_ID,seeds:[Buffer.from(seed),...values]}))[0];
}
export const companyPda=(authority:string,id:string)=>pda("company",addressBytes(authority),uuidBytes(id));
export const operatorPda=(company:string,wallet:string)=>pda("operator",addressBytes(company),addressBytes(wallet));
export const batchPda=(company:string,id:string)=>pda("batch",addressBytes(company),uuidBytes(id));
export const movementPda=(batch:string,id:string)=>pda("movement",addressBytes(batch),uuidBytes(id));
const read=(a:string)=>({address:address(a),role:AccountRole.READONLY});
const write=(a:string)=>({address:address(a),role:AccountRole.WRITABLE});
const signer=(a:string)=>({address:address(a),role:AccountRole.WRITABLE_SIGNER});
function instruction(name:string,accounts:Instruction["accounts"],...data:Uint8Array[]):Instruction{
  return {programAddress:PROGRAM_ID,accounts,data:Buffer.concat([discriminator("global",name),...data])};
}
export async function initializeCompany(authority:string,id:string){
  const company=await companyPda(authority,id);
  return instruction("initialize_company",[write(company),write(await operatorPda(company,authority)),signer(authority),read(SYSTEM_PROGRAM)],uuidBytes(id));
}
export async function registerBatch(company:string,actor:string,id:string,hash:string){
  return instruction("register_batch",[read(company),read(await operatorPda(company,actor)),write(await batchPda(company,id)),signer(actor),read(SYSTEM_PROGRAM)],uuidBytes(id),hashBytes(hash));
}
export async function recordMovement(company:string,batch:string,actor:string,id:string,sequence:bigint,hash:string,previous:string){
  return instruction("record_movement",[read(company),write(batch),read(await operatorPda(company,actor)),write(await movementPda(batch,id)),signer(actor),read(SYSTEM_PROGRAM)],uuidBytes(id),u64(sequence),hashBytes(hash),hashBytes(previous));
}
export async function authorizeOperator(company:string,authority:string,wallet:string){
  return instruction("authorize_operator",[read(company),write(await operatorPda(company,wallet)),signer(authority),read(SYSTEM_PROGRAM)],addressBytes(wallet));
}
export async function revokeOperator(company:string,authority:string,wallet:string){
  return instruction("revoke_operator",[read(company),write(await operatorPda(company,wallet)),{address:address(authority),role:AccountRole.READONLY_SIGNER}],addressBytes(wallet));
}
export async function transferCustody(company:string,batch:string,actor:string,recipient:string,id:string,sequence:bigint,hash:string,previous:string){
  return instruction("transfer_custody",[read(company),write(batch),read(await operatorPda(company,actor)),{address:address(recipient),role:AccountRole.READONLY_SIGNER},read(await operatorPda(company,recipient)),write(await movementPda(batch,id)),signer(actor),read(SYSTEM_PROGRAM)],uuidBytes(id),u64(sequence),hashBytes(hash),hashBytes(previous));
}
export function verifyBatch(company:string,batch:string,receipt:string,head:string,sequence:bigint){
  return instruction("verify_batch",[read(company),read(batch)],hashBytes(receipt),hashBytes(head),u64(sequence));
}
function accountData(data:Uint8Array,name:string,size:number){
  const b=Buffer.from(data);
  if(b.length!==size||!b.subarray(0,8).equals(discriminator("account",name)))throw new Error("Invalid "+name+" account");
  return b;
}
export function decodeCompany(data:Uint8Array){
  const b=accountData(data,"Company",65);
  return {authority:addressFromBytes(b.subarray(8,40)),externalId:b.subarray(40,56).toString("hex")};
}
export function decodeBatch(data:Uint8Array){
  const b=accountData(data,"Batch",233);
  return {company:addressFromBytes(b.subarray(8,40)),externalId:b.subarray(40,56).toString("hex"),
    payloadHash:b.subarray(56,88).toString("hex"),receiptHash:b.subarray(88,120).toString("hex"),headHash:b.subarray(120,152).toString("hex"),
    custodian:addressFromBytes(b.subarray(152,184)),lastMovement:addressFromBytes(b.subarray(184,216)),sequence:b.readBigUInt64LE(216)};
}
export function decodeMovement(data:Uint8Array){
  const b=accountData(data,"Movement",330);
  return {company:addressFromBytes(b.subarray(8,40)),batch:addressFromBytes(b.subarray(40,72)),externalId:b.subarray(72,88).toString("hex"),
    payloadHash:b.subarray(88,120).toString("hex"),previousHash:b.subarray(120,152).toString("hex"),evidenceHash:b.subarray(152,184).toString("hex"),
    previousMovement:addressFromBytes(b.subarray(184,216)),sequence:b.readBigUInt64LE(216),actor:addressFromBytes(b.subarray(224,256)),
    from:addressFromBytes(b.subarray(256,288)),to:addressFromBytes(b.subarray(288,320)),kind:b[320]!};
}

export { AccountRole } from "@solana/kit";
