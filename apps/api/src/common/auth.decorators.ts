import { BadRequestException, createParamDecorator, ExecutionContext, SetMetadata } from "@nestjs/common";
import type { AuthenticatedUser, PermissionCode } from "@repuchain/shared-types";
export const PUBLIC = "publicEndpoint";
export const PERMISSION = "requiredPermission";
export const Public = () => SetMetadata(PUBLIC, true);
export const RequirePermission = (permission: PermissionCode) => SetMetadata(PERMISSION, permission);
export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): AuthenticatedUser => ctx.switchToHttp().getRequest().user);

export const IdempotencyKey = createParamDecorator((_data: unknown, ctx: ExecutionContext): string => {
  const value = ctx.switchToHttp().getRequest().headers["idempotency-key"];
  if (typeof value !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw new BadRequestException("Idempotency-Key debe ser un UUID válido");
  }
  return value.toLowerCase();
});