import { CanActivate, ExecutionContext, ForbiddenException, Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import { DatabaseService } from "../../../database/database.service";
import { PUBLIC, PERMISSION } from "../../../common/auth.decorators";
import type { AuthenticatedUser, PermissionCode } from "@repuchain/shared-types";
@Injectable()
export class AccessGuard implements CanActivate {
  constructor(@Inject(Reflector) private readonly reflector: Reflector, @Inject(JwtService) private readonly jwt: JwtService, @Inject(DatabaseService) private readonly db: DatabaseService) {}
  async canActivate(ctx: ExecutionContext) {
    const targets = [ctx.getHandler(), ctx.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(PUBLIC, targets)) return true;
    const req = ctx.switchToHttp().getRequest<{ headers: { authorization?: string }; user?: AuthenticatedUser }>();
    const match = /^Bearer (\S+)$/i.exec(req.headers.authorization ?? "");
    if (!match?.[1]) throw new UnauthorizedException("Se requiere una sesión");
    let payload: { sub: string; sid: string; companyId: string };
    try { payload = await this.jwt.verifyAsync(match[1], { algorithms: ["HS256"], issuer: "repuchain", audience: "repuchain-api" }); }
    catch { throw new UnauthorizedException("Token inválido o expirado"); }
    const ids = [payload.sub, payload.sid, payload.companyId];
    if (!ids.every(id => typeof id === "string" && /^[0-9a-f-]{36}$/i.test(id))) throw new UnauthorizedException("Token inválido");
    const session = await this.db.client.session.findFirst({
      where: { id: payload.sid, userId: payload.sub, companyId: payload.companyId, revokedAt: null, expiresAt: { gt: new Date() }, user: { active: true } },
      include: { user: { include: { role: { include: { permissions: true } } } } },
    });
    if (!session) throw new UnauthorizedException("Sesión revocada");
    req.user = { id: session.userId, companyId: session.companyId, sessionId: session.id, name: session.user.name, email: session.user.email, role: session.user.role.name, permissions: session.user.role.permissions.map(p => p.permissionCode as PermissionCode) };
    const permission = this.reflector.getAllAndOverride<PermissionCode>(PERMISSION, targets);
    if (permission && !req.user.permissions.includes(permission)) throw new ForbiddenException("Permiso insuficiente");
    return true;
  }
}
