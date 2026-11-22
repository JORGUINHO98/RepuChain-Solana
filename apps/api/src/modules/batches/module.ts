import { Module } from "@nestjs/common";
import { BatchesController } from "./controllers/batches.controller";
import { BatchesService } from "./services/batches.service";
@Module({controllers:[BatchesController],providers:[BatchesService]})
export class BatchesModule {}
