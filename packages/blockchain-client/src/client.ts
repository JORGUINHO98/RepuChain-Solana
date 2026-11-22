import { createKeyPairSignerFromBytes, createTransactionMessage, setTransactionMessageFeePayer, setTransactionMessageLifetimeUsingBlockhash, appendTransactionMessageInstructions, compileTransaction, signTransaction, getSignatureFromTransaction, getBase64EncodedWireTransaction, blockhash, type KeyPairSigner, type Instruction } from "@solana/kit";
import { PROGRAM_ID,DEVNET_GENESIS,SYSTEM_PROGRAM,addressBytes,companyPda,batchPda,movementPda,decodeCompany,decodeBatch,decodeMovement,initializeCompany,registerBatch,recordMovement } from "./program";
import { uuidBytes,hashBytes,receiptHash,eventHash } from "./hashes";
export interface EvidenceJob {
  companyId:string; batchId:string; eventId:string; sequence:number; payloadHash:string;
  previousHash:string|null; previousEventId:string|null;
}
export interface PreparedTransaction {signature:string; wire:string; lastValidBlockHeight:bigint}
export interface VerifiedEvidence {account:string; companyAccount:string; evidenceHash:string}
type RpcAccount={owner:string;executable:boolean;data:[string,string]};
type SignatureStatus={err:unknown;confirmationStatus:string|null;slot:number};
export class EvidenceConflict extends Error {}
export class RepuChainClient {
  private constructor(readonly endpoint:string,readonly signer:KeyPairSigner,readonly local:boolean){}
  static async create(endpoint:string,key:Uint8Array,local=false){
    const url=new URL(endpoint);
    if(local ? !["localhost","127.0.0.1","[::1]"].includes(url.hostname) : url.protocol!=="https:") throw new Error("Invalid blockchain endpoint");
    const client=new RepuChainClient(endpoint,await createKeyPairSignerFromBytes(key),local);
    const genesis=await client.rpc<string>("getGenesisHash");
    if(!local&&genesis!==DEVNET_GENESIS)throw new Error("Only Solana Devnet is supported");
    const program=await client.account(PROGRAM_ID,false);
    if(!program?.executable)throw new Error("Program is not deployed");
    return client;
  }
  get authority():string{return this.signer.address;}
  async rpc<T>(method:string,params:unknown[]=[]):Promise<T>{
    const r=await fetch(this.endpoint,{method:"POST",headers:{"content-type":"application/json"},
      body:JSON.stringify({jsonrpc:"2.0",id:1,method,params}),signal:AbortSignal.timeout(12000)});
    if(!r.ok)throw new Error("Solana RPC HTTP "+r.status);
    const body=await r.json() as {result:T;error?:{code:number}};
    if(body.error)throw new Error("Solana RPC error "+body.error.code);
    return body.result;
  }
  async account(key:string,checkOwner=true){
    const {value}=await this.rpc<{value:RpcAccount|null}>("getAccountInfo",[key,{encoding:"base64",commitment:"confirmed"}]);
    if(value&&checkOwner&&value.owner!==PROGRAM_ID)throw new EvidenceConflict("Unexpected account owner");
    return value;
  }
  async signatureStatus(signature:string){
    return (await this.rpc<{value:(SignatureStatus|null)[]}>("getSignatureStatuses",[[signature],{searchTransactionHistory:true}])).value[0]??null;
  }
  async blockHeight(){return BigInt(await this.rpc<number>("getBlockHeight",[{commitment:"confirmed"}]));}
  async send(tx:PreparedTransaction){
    const signature=await this.rpc<string>("sendTransaction",[tx.wire,{encoding:"base64",preflightCommitment:"confirmed",maxRetries:2}]);
    if(signature!==tx.signature)throw new EvidenceConflict("Unexpected transaction signature");
  }
  async prepareInstructions(instructions:Instruction[]):Promise<PreparedTransaction>{
    const {value}=await this.rpc<{value:{blockhash:string;lastValidBlockHeight:number}}>("getLatestBlockhash",[{commitment:"confirmed"}]);
    const message=appendTransactionMessageInstructions(instructions,setTransactionMessageLifetimeUsingBlockhash(
      {blockhash:blockhash(value.blockhash),lastValidBlockHeight:BigInt(value.lastValidBlockHeight)},
      setTransactionMessageFeePayer(this.signer.address,createTransactionMessage({version:"legacy"}))));
    const tx=await signTransaction([this.signer.keyPair],compileTransaction(message));
    return {signature:getSignatureFromTransaction(tx),wire:getBase64EncodedWireTransaction(tx),lastValidBlockHeight:BigInt(value.lastValidBlockHeight)};
  }
  async addresses(job:EvidenceJob){
    const company=await companyPda(this.authority,job.companyId),batch=await batchPda(company,job.batchId);
    return {company,batch,target:job.sequence===0?batch:await movementPda(batch,job.eventId)};
  }
  async verify(job:EvidenceJob):Promise<VerifiedEvidence|null>{
    const {company,batch,target}=await this.addresses(job);
    const data=await this.account(target);if(!data)return null;
    const bytes=Buffer.from(data.data[0],"base64");
    if(job.sequence===0){
      const value=decodeBatch(bytes);
      const expected=receiptHash(addressBytes(company),addressBytes(batch),uuidBytes(job.batchId),hashBytes(job.payloadHash),addressBytes(this.authority));
      if(value.company!==company||value.externalId!==uuidBytes(job.batchId).toString("hex")||value.payloadHash!==job.payloadHash||value.receiptHash!==expected)throw new EvidenceConflict("Batch receipt mismatch");
      return {account:target,companyAccount:company,evidenceHash:expected};
    }
    if(!job.previousHash)throw new EvidenceConflict("Missing previous evidence hash");
    const value=decodeMovement(bytes);
    const previousMovement=job.previousEventId?await movementPda(batch,job.previousEventId):SYSTEM_PROGRAM;
    const expected=eventHash(addressBytes(batch),uuidBytes(job.eventId),BigInt(job.sequence),0,hashBytes(job.payloadHash),hashBytes(job.previousHash),addressBytes(this.authority),addressBytes(value.from),addressBytes(value.to));
    if(value.company!==company||value.batch!==batch||value.externalId!==uuidBytes(job.eventId).toString("hex")||value.sequence!==BigInt(job.sequence)||value.payloadHash!==job.payloadHash||value.previousHash!==job.previousHash||value.actor!==this.authority||value.kind!==0||value.from!==value.to||value.previousMovement!==previousMovement||value.evidenceHash!==expected)throw new EvidenceConflict("Movement evidence mismatch");
    return {account:target,companyAccount:company,evidenceHash:expected};
  }
  async prepare(job:EvidenceJob):Promise<PreparedTransaction>{
    const {company,batch}=await this.addresses(job),instructions:Instruction[]=[];
    const companyAccount=await this.account(company);
    if(companyAccount){
      const value=decodeCompany(Buffer.from(companyAccount.data[0],"base64"));
      if(value.authority!==this.authority||value.externalId!==uuidBytes(job.companyId).toString("hex"))throw new EvidenceConflict("Company identity mismatch");
    }else{
      if(job.sequence!==0)throw new EvidenceConflict("Company is missing");
      instructions.push(await initializeCompany(this.authority,job.companyId));
    }
    if(job.sequence===0)instructions.push(await registerBatch(company,this.authority,job.batchId,job.payloadHash));
    else {
      const raw=await this.account(batch);if(!raw)throw new EvidenceConflict("Batch is missing");
      const current=decodeBatch(Buffer.from(raw.data[0],"base64"));
      if(current.sequence+1n!==BigInt(job.sequence)||current.headHash!==job.previousHash)throw new EvidenceConflict("Chain sequence or head mismatch");
      instructions.push(await recordMovement(company,batch,this.authority,job.eventId,BigInt(job.sequence),job.payloadHash,job.previousHash!));
    }
    return this.prepareInstructions(instructions);
  }
}
