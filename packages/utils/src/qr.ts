const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function batchQr(companyId:string,batchId:string){
 if(!uuid.test(companyId)||!uuid.test(batchId))throw new Error("Identificador inválido");
 return "repuchain://batch/"+batchId.toLowerCase()+"?company="+companyId.toLowerCase()+"&v=1";
}
export function parseBatchQr(value:string):{companyId:string;batchId:string}{
 if(value.length>240)throw new Error("QR no válido de RepuChain");
 const match=/^repuchain:\/\/batch\/([0-9a-f-]+)\?company=([0-9a-f-]+)&v=1$/i.exec(value.trim());
 if(!match||!uuid.test(match[1]!)||!uuid.test(match[2]!))throw new Error("QR no válido de RepuChain");
 return {batchId:match[1]!.toLowerCase(),companyId:match[2]!.toLowerCase()};
}
