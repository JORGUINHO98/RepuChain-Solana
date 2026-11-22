import { describe, expect, it } from "vitest";
import { apiEnvironmentSchema, healthResponseSchema } from "../../packages/validation/src";
describe("Configuración del entorno", () => {
  it("rechaza un puerto inválido y un origen CORS inválido", () => {
    for (const PORT of ["-1", "0", "65536", "abc", "3.5"]) {
      expect(apiEnvironmentSchema.safeParse({ PORT }).success).toBe(false);
    }
    expect(apiEnvironmentSchema.safeParse({ WEB_ORIGIN: "localhost" }).success).toBe(false);
  });
  it("conserva un puerto y origen explícitos", () => {
    const config = apiEnvironmentSchema.parse({ PORT: "4500", WEB_ORIGIN: "http://localhost:3100" });
    expect(config.PORT).toBe(4500);
    expect(config.WEB_ORIGIN).toBe("http://localhost:3100");
  });
  it("rechaza respuestas incompatibles con el contrato de salud", () => {
    expect(healthResponseSchema.safeParse({ status: "ok" }).success).toBe(false);
    expect(healthResponseSchema.safeParse({ status: "ok", service: "another-api", version: "1" }).success).toBe(false);
  });
});
