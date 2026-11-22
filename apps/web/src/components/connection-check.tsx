"use client";
import { useState } from "react";
import { Button } from "@repuchain/ui";
import { fetchHealth } from "../services/health";
export function ConnectionCheck() {
  const [status, setStatus] = useState("Conexión sin comprobar");
  const [busy, setBusy] = useState(false);
  async function check() {
    setBusy(true);
    setStatus("Comprobando API…");
    try {
      const result = await fetchHealth(AbortSignal.timeout(5000));
      setStatus("API disponible · versión " + result.version);
    } catch { setStatus("API no disponible. Inicia el servidor en el puerto 4000."); }
    finally { setBusy(false); }
  }
  return <div className="connection"><Button onClick={check} disabled={busy}>{busy ? "Comprobando…" : "Comprobar conexión"}</Button><span role="status" aria-live="polite">{status}</span></div>;
}
