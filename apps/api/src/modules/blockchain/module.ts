import { Module } from "@nestjs/common";
import { BlockchainController } from "./controller";
@Module({controllers:[BlockchainController]})
export class BlockchainModule {}
