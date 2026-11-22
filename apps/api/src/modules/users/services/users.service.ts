import { ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { DatabaseService } from "../../../database/database.service";
import { hashPassword } from "@repuchain/security";
import type { AuthenticatedUser } from "@repuchain/shared-types";
import type { CreateUserInput, UpdateUserInput, ListQuery } from "@repuchain/validation";
import { audit } from "../../audit/services/audit";
import { serializable } from "../../../common/transaction";
const safeUser = { id: true, companyId: true, name: true, email: true, active: true, createdAt: true, role: { select: { id: true, name: true } } } as const;
@Injectable()
export class UsersService {
  constructor(@Inject(DatabaseService) private readonly db: DatabaseService) {}
  async list(user: AuthenticatedUser, query: ListQuery) {
    const where = { companyId: user.companyId, ...(query.search ? { name: { contains: query.search, mode: "insensitive" as const } } : {}) };
    const [items,total] = await this.db.client.$transaction([this.db.client.user.findMany({ where, select: safeUser, orderBy: { createdAt: "desc" }, skip: (query.page-1)*query.limit, take: query.limit }), this.db.client.user.count({ where })]);
    return { items,total,page:query.page,limit:query.limit };
  }
  async create(actor: AuthenticatedUser, input: CreateUserInput) {
    const passwordHash = await hashPassword(input.password);
    return this.db.client.$transaction(async tx => {
      if (!await tx.role.findFirst({ where: { id: input.roleId, companyId: actor.companyId } })) throw new NotFoundException("Rol no encontrado");
      const user = await tx.user.create({ data: { companyId: actor.companyId, roleId: input.roleId, name: input.name, email: input.email, passwordHash }, select: safeUser });
      await audit(tx, actor, "users.create", user.id, { roleId: input.roleId });
      return user;
    });
  }
  async update(actor: AuthenticatedUser, id: string, input: UpdateUserInput) {
    return serializable(this.db.client, async tx => {
      await tx.$queryRaw`SELECT id FROM companies WHERE id = ${actor.companyId}::uuid FOR UPDATE`;
      const user = await tx.user.findFirst({ where: { id, companyId: actor.companyId }, include: { role: true } });
      if (!user) throw new NotFoundException("Usuario no encontrado");
      const role = input.roleId ? await tx.role.findFirst({ where: { id: input.roleId, companyId: actor.companyId } }) : user.role;
      if (!role) throw new NotFoundException("Rol no encontrado");
      if (user.active && user.role.name === "ADMIN" && (input.active === false || role.name !== "ADMIN")) {
        const remaining = await tx.user.count({ where: { companyId: actor.companyId, active: true, role: { name: "ADMIN" }, id: { not: id } } });
        if (!remaining) throw new ConflictException("Debe quedar al menos un administrador activo");
      }
      const result = await tx.user.update({ where: { id_companyId: { id, companyId: actor.companyId } }, data: input, select: safeUser });
      if (input.active === false || input.roleId) await tx.session.updateMany({ where: { userId: id, companyId: actor.companyId, revokedAt: null }, data: { revokedAt: new Date() } });
      await audit(tx, actor, "users.update", id, { fields: Object.keys(input) });
      return result;
    });
  }
}
