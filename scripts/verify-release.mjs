import {spawnSync} from "node:child_process";
import {mkdir,writeFile} from "node:fs/promises";
const commands=["check","test:integration","smoke","mobile:check","db:check"];
if(process.argv.includes("--blockchain"))commands.push("blockchain:test","test:blockchain:integration");
const results=[];
await mkdir("reports",{recursive:true});
for(const name of commands){
 const start=Date.now(),result=spawnSync("pnpm",[name],{stdio:"inherit"});
 results.push({command:"pnpm "+name,passed:result.status===0,seconds:Math.round((Date.now()-start)/1000)});
 await writeFile("reports/release-check.json",JSON.stringify({generatedAt:new Date().toISOString(),complete:results.length===commands.length,passed:results.every(r=>r.passed),results},null,2));
 if(result.status!==0){process.exitCode=1;break;}
}
