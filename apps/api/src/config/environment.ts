import { config } from "dotenv";
import { apiRuntimeEnvironmentSchema } from "@repuchain/validation";
config();
export const environment = apiRuntimeEnvironmentSchema.parse(process.env);
