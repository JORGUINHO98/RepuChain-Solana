import { randomUUID } from "node:crypto";
import type { PrismaClient } from "@repuchain/database";
import { PROGRAM_ID,canonicalJson,sha256,EvidenceConflict,type Json,type EvidenceJob,type PreparedTransaction,type VerifiedEvidence } from "@repuchain/blockchain-client";
export interface EvidenceGateway {
  authority:string; local:boolean;
  verify(job:EvidenceJob):Promise<VerifiedEvidence|null>;
  signatureStatus(signature:string):Promise<{err:unknown;confirmationStatus:string|null}|null>;
  blockHeight():Promise<bigint>;
  prepare(job:EvidenceJob):Promise<PreparedTransaction>;
  send(tx:PreparedTransaction):Promise<void>;
}
export class OutboxProcessor {
  constructor(readonly db:PrismaClient,readonly gateway:EvidenceGateway,readonly companyId:string){}
  async bind(){
    const wanted={companyId:this.companyId,authority:this.gateway.authority,programId:PROGRAM_ID,network:this.gateway.local?"localnet":"devnet"};
    let binding=await this.db.blockchainBinding.findUnique({where:{companyId:this.companyId}});
    if(!binding){
      try{binding=await this.db.blockchainBinding.create({data:wanted});}
      catch(error){binding=await this.db.blockchainBinding.findUnique({where:{companyId:this.companyId}});if(!binding)throw error;}
    }
    if(binding.authority!==wanted.authority||binding.programId!==wanted.programId||binding.network!==wanted.network)throw new EvidenceConflict("Company blockchain binding cannot change");
  }
  async processOne():Promise<boolean>{
    await this.bind();
    const token=randomUUID();
    const rows=await this.db.$queryRaw<{id:string}[]>`
      WITH candidate AS (
        SELECT o.id FROM evidence_outbox o
        WHERE o."companyId"=${this.companyId}::uuid
          AND ((o.status='PENDING' AND o."availableAt"<=(clock_timestamp() AT TIME ZONE 'UTC')) OR (o.status='PROCESSING' AND o."lockedUntil"<(clock_timestamp() AT TIME ZONE 'UTC')))
          AND NOT EXISTS (SELECT 1 FROM evidence_outbox prior WHERE prior."batchId"=o."batchId" AND prior.sequence<o.sequence AND prior.status<>'CONFIRMED')
        ORDER BY o."availableAt",o."createdAt",o.id
        FOR UPDATE OF o SKIP LOCKED LIMIT 1
      )
      UPDATE evidence_outbox o SET status='PROCESSING',"leaseToken"=${token}::uuid,
        "lockedUntil"=(clock_timestamp() AT TIME ZONE 'UTC')+INTERVAL '120 seconds',attempts=attempts+1
      FROM candidate WHERE o.id=candidate.id RETURNING o.id`;
    if(!rows[0])return false;
    const id=rows[0].id;
    const heartbeat=setInterval(()=>void this.db.evidenceOutbox.updateMany({where:{id,leaseToken:token,status:"PROCESSING"},data:{lockedUntil:new Date(Date.now()+120000)}}).catch(()=>{}),20000);
    try{
      const row=await this.db.evidenceOutbox.findUniqueOrThrow({where:{id},include:{transactions:{orderBy:{createdAt:"desc"}}}});
      const payload=JSON.parse(row.canonicalPayload) as Json;
      if(canonicalJson(payload)!==row.canonicalPayload||sha256(row.canonicalPayload)!==row.payloadHash)throw new EvidenceConflict("Invalid stored canonical payload");
      const previous=row.sequence>0?await this.db.evidenceOutbox.findUniqueOrThrow({where:{batchId_sequence:{batchId:row.batchId,sequence:row.sequence-1}}}):null;
      if(previous&&previous.status!=="CONFIRMED")throw new EvidenceConflict("Predecessor is not confirmed");
      const job:EvidenceJob={companyId:row.companyId,batchId:row.batchId,eventId:row.eventId,sequence:row.sequence,payloadHash:row.payloadHash,
        previousHash:previous?.evidenceHash??null,previousEventId:previous&&previous.sequence>0?previous.eventId:null};
      let knownConfirmed:string|null=null;
      let pending:PreparedTransaction|undefined;
      for(const tx of row.transactions){
        const status=await this.gateway.signatureStatus(tx.signature);
        if(status&&!status.err&&["confirmed","finalized"].includes(status.confirmationStatus??"")){knownConfirmed=tx.signature;break;}
        if(!status?.err&&!pending&&await this.gateway.blockHeight()<=tx.lastValidBlockHeight)pending=tx;
      }
      const verified=await this.gateway.verify(job);
      if(verified&&knownConfirmed){
        await this.db.evidenceOutbox.updateMany({where:{id,leaseToken:token,status:"PROCESSING"},data:{
          status:"CONFIRMED",signature:knownConfirmed,account:verified.account,evidenceHash:verified.evidenceHash,
          confirmedAt:new Date(),leaseToken:null,lockedUntil:null,lastError:null,
        }});
        return true;
      }
      if(verified&&!knownConfirmed){
        if(row.transactions.length===0)throw new EvidenceConflict("Evidence exists without a known transaction");
        throw new Error("Awaiting signature confirmation");
      }
      if(knownConfirmed)throw new Error("Awaiting confirmed account");
      if(!pending){
        pending=await this.gateway.prepare(job);
        const prepared=pending;
        // Persist the signed bytes and signature BEFORE any submission to Solana.
        await this.db.$transaction(async tx=>{
          const owned=await tx.$queryRaw<{id:string}[]>`SELECT id FROM evidence_outbox WHERE id=${id}::uuid AND "leaseToken"=${token}::uuid AND status='PROCESSING' FOR UPDATE`;
          if(!owned.length)throw new Error("Lease lost");
          await tx.evidenceTransaction.create({data:{outboxId:id,...prepared}});
        });
      }
      await this.gateway.send(pending);
      const status=await this.gateway.signatureStatus(pending.signature);
      if(status?.err)throw new Error("Transaction failed");
      if(status&&["confirmed","finalized"].includes(status.confirmationStatus??"")){
        const result=await this.gateway.verify(job);
        if(result){
          await this.db.evidenceOutbox.updateMany({where:{id,leaseToken:token,status:"PROCESSING"},data:{
            status:"CONFIRMED",signature:pending.signature,account:result.account,evidenceHash:result.evidenceHash,
            confirmedAt:new Date(),leaseToken:null,lockedUntil:null,lastError:null,
          }});return true;
        }
      }
      throw new Error("Confirmation pending");
    }catch(error){
      const row=await this.db.evidenceOutbox.findUniqueOrThrow({where:{id}});
      const conflict=error instanceof EvidenceConflict;
      await this.db.evidenceOutbox.updateMany({where:{id,leaseToken:token,status:"PROCESSING"},data:{
        status:conflict||row.attempts>=10?"FAILED":"PENDING",
        availableAt:new Date(Date.now()+Math.min(300000,2000*2**Math.min(row.attempts,8))),
        leaseToken:null,lockedUntil:null,lastError:conflict?"CHAIN_CONFLICT":"RPC_OR_CONFIRMATION",
      }});
      return true;
    }finally{clearInterval(heartbeat);}
  }
}
