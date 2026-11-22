import { ConflictException } from "@nestjs/common";
import { Prisma, type PrismaClient } from "@repuchain/database";
function retryable(error:unknown):boolean {
  if(!(error instanceof Prisma.PrismaClientKnownRequestError))return false;
  if(error.code==="P2034")return true;
  const adapter=error.meta?.driverAdapterError as {cause?:{originalCode?:string;kind?:string}}|undefined;
  const code=String(error.meta?.code??adapter?.cause?.originalCode??"");
  return ["40001","40P01"].includes(code);
}
export async function serializable<T>(db: PrismaClient, action: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < 4; attempt++) {
    try { return await db.$transaction(action, { isolationLevel: "Serializable", maxWait: 5000, timeout: 10000 }); }
    catch (error) {
      if(!retryable(error))throw error;
      if (attempt === 3) throw new ConflictException("Conflicto concurrente. Reintenta con la misma clave de idempotencia.");
      await new Promise(resolve => setTimeout(resolve, 25 * (attempt + 1)));
    }
  }
  throw new Error("Unreachable transaction retry");
}
