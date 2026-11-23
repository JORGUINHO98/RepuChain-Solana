import {afterEach,it,expect,vi} from "vitest";
import {NextRequest} from "../../apps/web/node_modules/next/server";
import {POST} from "../../apps/web/src/app/api/wallet/[action]/route";
afterEach(()=>vi.unstubAllGlobals());
it.each(["{","null","[]","42",'"hello"'])("rechaza un cuerpo inválido %s sin llamar a la API",async(body)=>{
 const fetcher=vi.fn();vi.stubGlobal("fetch",fetcher);
 const request=new NextRequest("http://localhost:3000/api/wallet/challenge",{method:"POST",headers:{host:"localhost:3000",origin:"http://localhost:3000","content-type":"application/json"},body});
 const result=await POST(request,{params:Promise.resolve({action:"challenge"})});
 expect(result.status).toBe(400);expect(fetcher).not.toHaveBeenCalled();
});
