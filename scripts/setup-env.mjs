import { copyFile,readFile,writeFile,chmod } from "node:fs/promises";
import { constants } from "node:fs";
import { randomBytes } from "node:crypto";
for(const dir of [".","apps/api","apps/web","apps/mobile","database"]){
  try{await copyFile(dir+"/.env.example",dir+"/.env",constants.COPYFILE_EXCL);console.log("Creado "+dir+"/.env");}
  catch(error){if(error.code!=="EEXIST") throw error;}
}
async function ensure(path,key,value){
  let text=await readFile(path,"utf8");
  const expression=new RegExp("^"+key+"=.*$","m");
  const existing=text.match(expression)?.[0];
  if(!existing) text+="\n"+key+"="+value+"\n";
  else if(existing.includes("REPLACE_")) text=text.replace(expression,key+"="+value);
  await writeFile(path,text,{mode:0o600});
  if(process.platform!=="win32") await chmod(path,0o600);
}
const dbEnv=await readFile("database/.env","utf8");
const url=dbEnv.match(/^DATABASE_URL=(.+)$/m)?.[1]?.trim();
if(!url) throw new Error("Falta DATABASE_URL en database/.env");
await ensure("apps/api/.env","DATABASE_URL",url);
await ensure("apps/api/.env","JWT_SECRET",randomBytes(48).toString("hex"));
await ensure("database/.env","SEED_ADMIN_EMAIL","admin@repuchain.local");
await ensure("database/.env","SEED_ADMIN_PASSWORD",randomBytes(24).toString("base64url"));
console.log("Entorno preparado. No se sobrescribieron secretos existentes.");

try { await copyFile(".env.test.example", ".env.test", constants.COPYFILE_EXCL); }
catch (error) { if (error.code !== "EEXIST") throw error; }