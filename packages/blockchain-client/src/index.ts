export * from "./hashes";
export * from "./program";
export * from "./client";
import {createSolanaRpc,devnet} from "@solana/kit";
export function createDevnetRpc(){return createSolanaRpc(devnet("https://api.devnet.solana.com"));}
