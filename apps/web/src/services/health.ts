import { healthResponseSchema } from "@repuchain/validation";
import type { HealthResponse } from "@repuchain/shared-types";
export async function fetchHealth(signal: AbortSignal): Promise<HealthResponse> {
  const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";
  const response = await fetch(base + "/health", { signal, cache: "no-store" });
  if (!response.ok) throw new Error("La API respondió con un error.");
  return healthResponseSchema.parse(await response.json());
}
