import pg from "pg";
const raw=process.env.TEST_DATABASE_URL;
if(!raw)throw new Error("Falta TEST_DATABASE_URL.");
const url=new URL(raw),name=url.pathname.slice(1);
if(!/^[a-zA-Z0-9_]+_test$/.test(name))throw new Error("La base de prueba debe terminar en _test.");
url.pathname="/postgres";
const client=new pg.Client({connectionString:url.toString(),connectionTimeoutMillis:5000});
try{
  await client.connect();
  if(!(await client.query("SELECT 1 FROM pg_database WHERE datname = $1",[name])).rowCount){
    await client.query('CREATE DATABASE "'+name+'"');
    console.log("Base de pruebas creada.");
  }else console.log("Base de pruebas existente; se conservan los datos.");
}finally{await client.end();}
