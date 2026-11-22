import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/client";
export { Prisma, PrismaClient } from "./generated/client";
export function createDatabase(connectionString: string) {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString, max: 10, connectionTimeoutMillis: 5000 }) });
}
