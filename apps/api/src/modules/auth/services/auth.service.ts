import {DEFAULT_ROLES,PERMISSIONS} from "@repuchain/shared-types";
import {Prisma} from "@repuchain/database";
import { Inject, Injectable, UnauthorizedException, ConflictException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { DatabaseService } from "../../../database/database.service";
import { createRefreshToken, hashPassword, sha256, verifyPassword } from "@repuchain/security";
import type { LoginInput, RegisterInput } from "@repuchain/validation";
import type { AuthenticatedUser, TokenResponse } from "@repuchain/shared-types";
import { audit } from "../../audit/services/audit";

@Injectable()
export class AuthService {
  private readonly dummyHash = hashPassword(createRefreshToken());
  constructor(@Inject(DatabaseService) private readonly db: DatabaseService, @Inject(JwtService) private readonly jwt: JwtService) {}
  async tokens(userId: string, companyId: string, sessionId: string, refreshToken: string): Promise<TokenResponse> {
    return {
      accessToken: await this.jwt.signAsync({ sub: userId, companyId, sid: sessionId }),
      refreshToken, tokenType: "Bearer", expiresIn: 900,
    };
  }
  async register(input:RegisterInput){
    const passwordHash=await hashPassword(input.password);
    try{
      await this.db.client.$transaction(async tx=>{
        // Create only: registration can never join or take over an existing tenant.
        const company=await tx.company.create({data:{slug:input.companySlug,name:input.companyName}});
        await tx.permission.createMany({data:PERMISSIONS.map(code=>({code,description:code})),skipDuplicates:true});
        let adminRoleId="";
        for(const [name,permissions] of Object.entries(DEFAULT_ROLES)){
          const role=await tx.role.create({data:{companyId:company.id,name}});
          await tx.rolePermission.createMany({data:permissions.map(permissionCode=>({roleId:role.id,permissionCode}))});
          if(name==="ADMIN")adminRoleId=role.id;
        }
        const user=await tx.user.create({data:{companyId:company.id,roleId:adminRoleId,name:input.name,email:input.email,passwordHash}});
        await audit(tx,user,"auth.register",company.id);
      });
    }catch(error){
      if(error instanceof Prisma.PrismaClientKnownRequestError&&error.code==="P2002")throw new ConflictException("Ese identificador de empresa ya existe. Elige otro o inicia sesión.");
      throw error;
    }
    return this.login({companySlug:input.companySlug,email:input.email,password:input.password});
  }
  async login(input: LoginInput) {
    const user = await this.db.client.user.findFirst({
      where: { email: input.email, company: { slug: input.companySlug } },
    });
    const valid = await verifyPassword(input.password, user?.passwordHash ?? await this.dummyHash);
    if (!user || !user.active || !valid) throw new UnauthorizedException("Credenciales inválidas");
    const token = createRefreshToken();
    const expiresAt = new Date(Date.now() + 7 * 86400000);
    const session = await this.db.client.$transaction(async tx => {
      const active = await tx.user.findFirst({ where: { id: user.id, active: true } });
      if (!active) throw new UnauthorizedException("Credenciales inválidas");
      const session = await tx.session.create({ data: {
        userId: user.id, companyId: user.companyId, expiresAt,
        tokens: { create: { tokenHash: sha256(token), expiresAt } },
      } });
      await audit(tx, user, "auth.login", session.id);
      return session;
    });
    return this.tokens(user.id, user.companyId, session.id, token);
  }
  async refresh(rawToken: string) {
    const hash = sha256(rawToken);
    const replacement = createRefreshToken();
    const result = await this.db.client.$transaction(async tx => {
      const token = await tx.refreshToken.findUnique({ where: { tokenHash: hash }, include: { session: { include: { user: true } } } });
      const now = new Date();
      if (!token || token.expiresAt <= now || token.session.expiresAt <= now || token.session.revokedAt || !token.session.user.active) return null;
      // Lock the family so refresh and logout cannot race into a live successor.
      await tx.$queryRaw`SELECT id FROM sessions WHERE id = ${token.sessionId}::uuid FOR UPDATE`;
      const session = await tx.session.findUniqueOrThrow({ where: { id: token.sessionId } });
      if (session.revokedAt) return null;
      const used = await tx.refreshToken.updateMany({ where: { id: token.id, usedAt: null }, data: { usedAt: now } });
      if (used.count !== 1) {
        await tx.session.update({ where: { id: session.id }, data: { revokedAt: now } });
        await audit(tx, token.session.user, "auth.refresh_replay", session.id);
        return null; // Commit the revocation before returning 401.
      }
      await tx.refreshToken.create({ data: { sessionId: session.id, tokenHash: sha256(replacement), expiresAt: session.expiresAt } });
      return session;
    });
    if (!result) throw new UnauthorizedException("Sesión inválida o expirada");
    return this.tokens(result.userId, result.companyId, result.id, replacement);
  }
  async logout(user: AuthenticatedUser) {
    await this.db.client.$transaction(async tx => {
      await tx.session.updateMany({ where: { id: user.sessionId, userId: user.id, companyId: user.companyId, revokedAt: null }, data: { revokedAt: new Date() } });
      await audit(tx, user, "auth.logout", user.sessionId);
    });
    return { revoked: true };
  }
}
