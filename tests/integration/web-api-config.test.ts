import {afterEach,describe,it,expect,vi} from "vitest";
import {upstream} from "../../apps/web/src/lib/server-api";

afterEach(()=>{
 vi.unstubAllEnvs();
 vi.unstubAllGlobals();
});

describe("web API upstream configuration",()=>{
 it("requires a reachable HTTPS API URL in production",async()=>{
  vi.stubEnv("NODE_ENV","production");
  vi.stubEnv("API_INTERNAL_URL",undefined);
  const fetcher=vi.fn();
  vi.stubGlobal("fetch",fetcher);

  await expect(upstream("/auth/wallet/challenge")).rejects.toThrow("API_INTERNAL_URL no está configurada");
  expect(fetcher).not.toHaveBeenCalled();
 });

 it("keeps the localhost API fallback in development",async()=>{
  vi.stubEnv("NODE_ENV","development");
  vi.stubEnv("API_INTERNAL_URL",undefined);
  vi.stubEnv("NEXT_PUBLIC_API_URL",undefined);
  const fetcher=vi.fn().mockResolvedValue(new Response("{}",{status:200}));
  vi.stubGlobal("fetch",fetcher);

  await upstream("/auth/wallet/challenge");

  expect(fetcher).toHaveBeenCalledWith(
   "http://127.0.0.1:4000/api/v1/auth/wallet/challenge",
   expect.objectContaining({cache:"no-store"}),
  );
 });

 it("allows an HTTP loopback API for a local production smoke test",async()=>{
  vi.stubEnv("NODE_ENV","production");
  vi.stubEnv("VERCEL",undefined);
  vi.stubEnv("API_INTERNAL_URL","http://127.0.0.1:4000/api/v1");
  const fetcher=vi.fn().mockResolvedValue(new Response("{}",{status:200}));
  vi.stubGlobal("fetch",fetcher);

  await upstream("/health");

  expect(fetcher).toHaveBeenCalledWith(
   "http://127.0.0.1:4000/api/v1/health",
   expect.objectContaining({cache:"no-store"}),
  );
 });

 it("rejects an HTTP loopback API on Vercel",async()=>{
  vi.stubEnv("NODE_ENV","production");
  vi.stubEnv("VERCEL","1");
  vi.stubEnv("API_INTERNAL_URL","http://127.0.0.1:4000/api/v1");

  await expect(upstream("/health")).rejects.toThrow("HTTPS");
 });
});
