import {spawnSync} from "node:child_process";
import {copyFile,mkdir,readFile,writeFile} from "node:fs/promises";
import {createHash} from "node:crypto";
function run(command,args){
  const result=spawnSync(command,args,{stdio:"inherit",env:{...process.env,CARGO_BUILD_JOBS:"2"}});
  if(result.status!==0)process.exit(result.status??1);
}
run("anchor",["build"]);
run("cargo",["test","--locked","-p","repu-chain","--","--test-threads=1"]);
run(process.execPath,["scripts/check-evidence-vectors.mjs"]);
const idl=JSON.parse(await readFile("target/idl/repu_chain.json","utf8"));
if(idl.address!=="3hgkgx5V7UgU1Dac8R6ZCx2ZYs1PeHPUphFgRmG52GWv")throw new Error("IDL con dirección inesperada");
const names=idl.instructions.map(i=>i.name).sort();
const expected=["initialize_company","authorize_operator","revoke_operator","register_batch","record_movement","transfer_custody","verify_batch"].sort();
if(JSON.stringify(names)!==JSON.stringify(expected))throw new Error("IDL incompleta");
await mkdir("blockchain/idl",{recursive:true});
await copyFile("target/idl/repu_chain.json","blockchain/idl/repu_chain.json");
const binary=await readFile("target/deploy/repu_chain.so");
await writeFile("target/blockchain-test-receipt.json",JSON.stringify({
  testedAt:new Date().toISOString(),programId:idl.address,binarySha256:createHash("sha256").update(binary).digest("hex"),
  binaryBytes:binary.length,tests:"cargo test --locked -p repu-chain; independent Node vectors",passed:true,
},null,2));
console.log("Programa e IDL verificados. Evidencia local: target/blockchain-test-receipt.json");
