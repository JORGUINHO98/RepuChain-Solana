import {afterEach,it,expect,vi} from "vitest";
import {api,ApiError} from "../../apps/web/src/lib/panel";
afterEach(()=>vi.unstubAllGlobals());
it("expira la sesión incluso cuando un 401 devuelve HTML",async()=>{
 const dispatchEvent=vi.fn();vi.stubGlobal("window",{dispatchEvent});
 vi.stubGlobal("fetch",vi.fn().mockResolvedValue(new Response("<html>Error</html>",{status:401})));
 await expect(api("dashboard")).rejects.toMatchObject({status:401});
 expect(dispatchEvent).toHaveBeenCalledWith(expect.objectContaining({type:"session-expired"}));
});
it("presenta un error HTTP legible cuando el proxy devuelve HTML",async()=>{
 vi.stubGlobal("fetch",vi.fn().mockResolvedValue(new Response("<html>Unavailable</html>",{status:503})));
 await expect(api("dashboard")).rejects.toBeInstanceOf(ApiError);
});
