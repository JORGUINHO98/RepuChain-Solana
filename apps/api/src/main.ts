import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { environment } from "./config/environment";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix("api/v1");
  app.enableCors({ origin: environment.WEB_ORIGIN, credentials: true });
  app.enableShutdownHooks();
  await app.listen(environment.PORT, environment.HOST);
}
bootstrap().catch((error: unknown) => {
  console.error("No se pudo iniciar RepuChain API", error);
  process.exitCode = 1;
});
