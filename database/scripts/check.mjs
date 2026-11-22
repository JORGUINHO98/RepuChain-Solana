import "dotenv/config";
import pg from "pg";
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL no está configurada.");
const client = new pg.Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5000 });
try {
  await client.connect();
  const result = await client.query("SELECT current_database() AS database, version() AS version");
  console.log(result.rows[0]);
} finally { await client.end(); }
