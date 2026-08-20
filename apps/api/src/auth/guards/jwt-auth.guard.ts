import { CanActivate, ExecutionContext, Inject, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type { Action, Language, Resource } from "@motorcycle-system/shared-types";
import { PrismaService } from "../../prisma/prisma.service.js";
import { AppError } from "../../common/errors/app-error.js";
import type { AuthenticatedRequest, AuthenticatedUser } from "../../common/types/authenticated-request.js";
import { verifyToken } from "../../utils/jwt.js";

const userWithRole = {
  include: {
    role: {
      include: {
        permissions: true,
      },
    },
  },
} satisfies Prisma.UserDefaultArgs;

type UserWithRole = Prisma.UserGetPayload<typeof userWithRole>;

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) { }

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const header = request.headers.authorization;
    const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : null;

    if (!token) {
      throw new AppError("TOKEN_INVALID", 401, "Authentication token is required");
    }

    let payload;
    try {
      payload = verifyToken(token, "access");
    } catch {
      throw new AppError("TOKEN_INVALID", 401, "Invalid or expired token");
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      ...userWithRole,
    });

    if (!user) {
      throw new AppError("TOKEN_INVALID", 401, "Invalid or expired token");
    }

    if (!user.isActive) {
      throw new AppError("ACCOUNT_INACTIVE", 403, "User account is inactive");
    }

    request.user = this.toAuthenticatedUser(user);
    return true;
  }

  private toAuthenticatedUser(user: UserWithRole): AuthenticatedUser {
    const isSuperAdmin = user.role.name === 'super_admin';
    const isCustomer = user.role.name === 'customer';
    
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      roleId: user.roleId,
      roleName: user.role.name,
      branchId: user.branchId,
      lang: user.lang as Language,
      permissions: user.role.permissions.map((permission) => ({
        resource: permission.resource as Resource,
        action: permission.action as Action,
      })),
      isSuperAdmin,
      isCustomer,
      customerId: isCustomer ? user.id : undefined,
    };
  }
}
