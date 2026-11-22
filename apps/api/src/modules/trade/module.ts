import {Module} from "@nestjs/common";
import {TradeController} from "./controller";
import {TradeService} from "./service";
import {MovementsService} from "../movements/services/movements.service";
@Module({controllers:[TradeController],providers:[TradeService,MovementsService]})
export class TradeModule {}
