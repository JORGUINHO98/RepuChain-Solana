import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { AuthController } from "./controllers/auth.controller";
import { AuthService } from "./services/auth.service";
import { AccessGuard } from "./guards/access.guard";
import { environment } from "../../config/environment";
@Module({
  imports: [JwtModule.register({ secret: environment.JWT_SECRET, signOptions: { expiresIn: 900, algorithm: "HS256", issuer: "repuchain", audience: "repuchain-api" } })],
  controllers: [AuthController], providers: [AuthService, AccessGuard], exports: [AccessGuard, JwtModule],
})
export class AuthModule {}
