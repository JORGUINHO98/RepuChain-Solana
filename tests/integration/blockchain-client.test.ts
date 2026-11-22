import {describe,it,expect} from "vitest";
import {readFileSync} from "node:fs";
import {AccountRole} from "../../packages/blockchain-client/src";
import {canonicalJson,payloadHash,receiptHash,eventHash,uuidBytes,u64,discriminator,initializeCompany,registerBatch,recordMovement,authorizeOperator,revokeOperator,transferCustody,verifyBatch,companyPda,batchPda,decodeBatch,decodeMovement} from "../../packages/blockchain-client/src";
const bytes=(n:number,size=32)=>Buffer.alloc(size,n);
const id="11111111-2222-4333-8444-555555555555";
const actor="8FreXnhKCs7VeTtWz8BhqDsEzREASeWDFj1zZLV7ZCqv";
const recipient="DvPk4NiE9vPZmR1TxE4C5X23stk7n2oTtcrVMW6Rqjq2";
describe("Cliente blockchain",()=>{
  it("canonicaliza claves anidadas y conserva strings, null y arrays",()=>{
    expect(canonicalJson({b:[null,"á",3],a:{z:true,c:""}})).toBe('{"a":{"c":"","z":true},"b":[null,"á",3]}');
    expect(payloadHash({b:2,a:1})).toBe(payloadHash({a:1,b:2}));
    expect(payloadHash({a:1})).not.toBe(payloadHash({a:"1"}));
    for(const value of [NaN,Infinity,1.2,-0,Number.MAX_SAFE_INTEGER+1,undefined,new Array(2),new Date(),{a:undefined}])expect(()=>canonicalJson(value as any)).toThrow();
  });
  it("coincide con los tres vectores del programa Rust",()=>{
    expect(receiptHash(bytes(1),bytes(2),bytes(3,16),bytes(4),bytes(5))).toBe("bc89a3bc694d4a3d3b63d8c37690e05c947b3b872c01c37045976c4bb0e937a5");
    expect(eventHash(bytes(2),bytes(6,16),258n,0,bytes(7),bytes(8),bytes(5),bytes(9),bytes(9))).toBe("834455c9ab7e11242a9edd2f917501af1cc1c4682653e98a40f6b73e2875f698");
    expect(eventHash(bytes(2),bytes(6,16),258n,1,bytes(7),bytes(8),bytes(5),bytes(9),bytes(10))).toBe("9deae620881fb868b60439a3b871d97f4bab993e2b5a5a16270226224129a1a5");
  });
  it("rechaza UUID, u64 y cuentas inválidos",()=>{
    expect(()=>uuidBytes("00000000-0000-0000-0000-000000000000")).toThrow();
    expect(()=>uuidBytes("bad")).toThrow();expect(()=>u64(-1n)).toThrow();
    expect(()=>decodeBatch(Buffer.alloc(233))).toThrow();expect(()=>decodeMovement(Buffer.alloc(330))).toThrow();
  });
  it("las siete instrucciones coinciden con discriminadores, permisos y tamaños de la IDL",async()=>{
    const company=await companyPda(actor,id),batch=await batchPda(company,id),hash="ab".repeat(32);
    const instructions=[
      await initializeCompany(actor,id),await registerBatch(company,actor,id,hash),await recordMovement(company,batch,actor,id,1n,hash,hash),
      await authorizeOperator(company,actor,recipient),await revokeOperator(company,actor,recipient),
      await transferCustody(company,batch,actor,recipient,id,1n,hash,hash),verifyBatch(company,batch,hash,hash,1n),
    ];
    const idl=JSON.parse(readFileSync("blockchain/idl/repu_chain.json","utf8"));
    const sizes:Record<string,number>={initialize_company:24,register_batch:56,record_movement:96,authorize_operator:40,revoke_operator:40,transfer_custody:96,verify_batch:80};
    for(const ix of instructions){
      const entry=idl.instructions.find((v:any)=>Buffer.from(v.discriminator).equals(Buffer.from(ix.data!).subarray(0,8)));
      expect(entry).toBeDefined();expect(ix.accounts).toHaveLength(entry.accounts.length);
      expect(ix.data).toHaveLength(sizes[entry.name]!);
      entry.accounts.forEach((a:any,i:number)=>{
        const role=ix.accounts![i]!.role;
        expect([AccountRole.WRITABLE,AccountRole.WRITABLE_SIGNER].includes(role)).toBe(!!a.writable);
        expect([AccountRole.READONLY_SIGNER,AccountRole.WRITABLE_SIGNER].includes(role)).toBe(!!a.signer);
      });
      expect(Buffer.from(ix.data!).subarray(0,8)).toEqual(discriminator("global",entry.name));
    }
  });
});
