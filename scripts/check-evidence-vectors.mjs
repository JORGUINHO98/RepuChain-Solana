import {createHash} from "node:crypto";
import assert from "node:assert/strict";
const hash=(...parts)=>createHash("sha256").update(Buffer.concat(parts)).digest("hex");
const bytes=(n,length=32)=>Buffer.alloc(length,n);
const sequence=Buffer.alloc(8);sequence.writeBigUInt64LE(258n);
assert.equal(hash(Buffer.from("REPUCHAIN_RECEIPT_V1"),bytes(1),bytes(2),bytes(3,16),bytes(4),bytes(5)),
"bc89a3bc694d4a3d3b63d8c37690e05c947b3b872c01c37045976c4bb0e937a5");
assert.equal(hash(Buffer.from("REPUCHAIN_EVENT_V1"),bytes(2),bytes(6,16),sequence,bytes(0,1),bytes(7),bytes(8),bytes(5),bytes(9),bytes(9)),
"834455c9ab7e11242a9edd2f917501af1cc1c4682653e98a40f6b73e2875f698");
assert.equal(hash(Buffer.from("REPUCHAIN_EVENT_V1"),bytes(2),bytes(6,16),sequence,bytes(1,1),bytes(7),bytes(8),bytes(5),bytes(9),bytes(10)),
"9deae620881fb868b60439a3b871d97f4bab993e2b5a5a16270226224129a1a5");
console.log("3 vectores SHA-256 independientes correctos.");
