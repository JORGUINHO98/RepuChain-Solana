import { healthResponseSchema } from "@repuchain/validation";
import type { HealthResponse } from "@repuchain/shared-types";
export async function fetchHealth(): Promise<HealthResponse> {
  const base = process.env.EXPO_PUBLIC_API_URL;
  if (!base) throw new Error("Configura EXPO_PUBLIC_API_URL con una dirección accesible desde tu dispositivo.");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(base + "/health", { signal: controller.signal });
    if (!response.ok) throw new Error("La API respondió con un error.");
    return healthResponseSchema.parse(await response.json());
  } finally { clearTimeout(timeout); }
}
