const { createDevnetRpc } = require("../packages/blockchain-client/dist/index.js");
createDevnetRpc().getVersion().send({ abortSignal: AbortSignal.timeout(10000) })
  .then(version => console.log("Devnet RPC responde:", version))
  .catch(error => { console.error("No se pudo consultar Devnet:", error.message); process.exitCode = 1; });
