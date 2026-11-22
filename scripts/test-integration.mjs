import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
const url=process.env.TEST_DATABASE_URL;
if(!url||!new URL(url).pathname.endsWith("_test")) throw new Error("TEST_DATABASE_URL debe apuntar a una base cuyo nombre termine en _test.");
function run(args,env={}){
  const result=spawnSync("pnpm",args,{stdio:"inherit",env:{...process.env,...env}});
  if(result.status!==0) process.exit(result.status??1);
}
run(["exec","turbo","run","build","--filter=@repuchain/api"]);
run(["--filter","@repuchain/database","migrate:deploy"],{DATABASE_URL:url});
run(["exec","vitest","run","--config",process.argv.includes("--blockchain")?"vitest.blockchain.config.mts":"vitest.integration.config.mts"],{JWT_SECRET:randomBytes(48).toString("hex")});
