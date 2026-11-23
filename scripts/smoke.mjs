import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { once } from "node:events";
import { setTimeout as delay } from "node:timers/promises";

async function freePort() {
  const server = createServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const port = server.address().port;
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  return port;
}
const children = [];
function start(args, cwd, env) {
  const child = spawn(process.execPath, args, { cwd, env: { ...process.env, ...env }, stdio: ["ignore", "pipe", "pipe"] });
  child.logs = "";
  child.stdout.on("data", data => { child.logs += data; });
  child.stderr.on("data", data => { child.logs += data; });
  children.push(child);
  return child;
}
async function waitFor(url, child) {
  for (let i = 0; i < 80; i++) {
    if (child.exitCode !== null) throw new Error("El proceso terminó: " + child.logs);
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(1000) });
      if (response.ok) return response;
    } catch {}
    await delay(250);
  }
  throw new Error("Tiempo de espera agotado: " + url + "\n" + child.logs);
}
try {
  const apiPort = await freePort();
  const webPort = await freePort();
  const origin = "http://127.0.0.1:" + webPort;
  const api = start(["dist/main.js"], "apps/api", { NODE_ENV: "development", PORT: String(apiPort), WEB_ORIGIN: origin, HOST: "127.0.0.1" });
  const url = "http://127.0.0.1:" + apiPort + "/api/v1/health";
  const response = await waitFor(url, api);
  assert.deepEqual(await response.json(), { status: "ok", service: "repuchain-api", version: "0.2.0" });
  const emailLogin=await fetch("http://127.0.0.1:"+apiPort+"/api/v1/auth/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({companySlug:"demo",email:"test@example.com",password:"ExamplePassword123!"})});
  assert.equal(emailLogin.status,403,"Email login must be disabled outside test");
  const allowed = await fetch(url, { headers: { Origin: origin } });
  assert.equal(allowed.headers.get("access-control-allow-origin"), origin);
  const denied = await fetch(url, { headers: { Origin: "https://untrusted.invalid" } });
  assert.notEqual(denied.headers.get("access-control-allow-origin"), "https://untrusted.invalid");
  const missing = await fetch(url + "/missing");
  assert.equal(missing.status, 404);
  const web = start(["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", String(webPort)], "apps/web", { NEXT_TELEMETRY_DISABLED: "1", API_INTERNAL_URL: "http://127.0.0.1:"+apiPort+"/api/v1" });
  const page = await waitFor(origin, web);
  const html = await page.text();
  assert.ok(html.includes("RepuChain"));
  assert.ok(html.includes("Comprobando acceso"));
  const sessions=start(["scripts/test-web-session.mjs"],".",{WEB_URL:origin});
  const [exitCode]=await once(sessions,"exit");
  assert.equal(exitCode,0,"Falló la comprobación de sesión web: "+sessions.logs);
  console.log("OK: API real, contrato HTTP, CORS, 404 y página Next.js de producción.");
} finally {
  await Promise.all(children.map(async child => {
    if (child.exitCode !== null) return;
    child.kill("SIGTERM");
    await Promise.race([once(child, "exit"), delay(5000)]);
    if (child.exitCode === null) child.kill("SIGKILL");
  }));
}
