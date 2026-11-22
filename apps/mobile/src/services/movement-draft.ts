import {movementSchema,type MovementInput} from "@repuchain/validation";
export interface PendingMovement{base:string;userId:string;companyId:string;key:string;body:MovementInput}
export function readPending(raw:string,scope:{base:string;userId:string;companyId:string}):PendingMovement{
 const p=JSON.parse(raw) as PendingMovement;
 if(p.base!==scope.base||p.userId!==scope.userId||p.companyId!==scope.companyId||!/^[-0-9a-f]{36}$/i.test(p.key))throw new Error("El envío pendiente pertenece a otro acceso. No se enviará.");
 return {...p,body:movementSchema.parse(p.body)};
}
