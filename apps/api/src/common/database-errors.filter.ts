import { ArgumentsHost, Catch, ExceptionFilter, Logger } from "@nestjs/common";
import { Prisma } from "@repuchain/database";
@Catch(Prisma.PrismaClientKnownRequestError)
export class DatabaseErrorsFilter implements ExceptionFilter {
  private readonly logger = new Logger(DatabaseErrorsFilter.name);
  catch(error: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const status = error.code === "P2025" ? 404 : ["P2002","P2003","P2004","P2034"].includes(error.code) ? 409 : 500;
    if (status === 500) this.logger.error("Fallo de persistencia: " + error.code);
    host.switchToHttp().getResponse().status(status).json({
      statusCode: status,
      message: status === 404 ? "Registro no encontrado" : status === 409 ? "La operación entra en conflicto con los datos existentes" : "Error interno de persistencia",
    });
  }
}
