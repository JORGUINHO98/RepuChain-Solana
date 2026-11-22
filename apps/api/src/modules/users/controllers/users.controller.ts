import { Body, Controller, Get, Inject, Param, ParseUUIDPipe, Patch, Post, Query } from "@nestjs/common";
import type { AuthenticatedUser } from "@repuchain/shared-types";
import { createUserSchema, updateUserSchema, listQuerySchema, type CreateUserInput, type UpdateUserInput, type ListQuery } from "@repuchain/validation";
import { CurrentUser, RequirePermission } from "../../../common/auth.decorators";
import { ZodPipe } from "../../../common/validation.pipe";
import { UsersService } from "../services/users.service";
@Controller("users") @RequirePermission("users:manage")
export class UsersController {
  constructor(@Inject(UsersService) private readonly users: UsersService) {}
  @Get() list(@CurrentUser() user: AuthenticatedUser, @Query(new ZodPipe(listQuerySchema)) query: ListQuery) { return this.users.list(user, query); }
  @Post() create(@CurrentUser() user: AuthenticatedUser, @Body(new ZodPipe(createUserSchema)) input: CreateUserInput) { return this.users.create(user, input); }
  @Patch(":id") update(@CurrentUser() user: AuthenticatedUser, @Param("id", ParseUUIDPipe) id: string, @Body(new ZodPipe(updateUserSchema)) input: UpdateUserInput) { return this.users.update(user, id, input); }
}
