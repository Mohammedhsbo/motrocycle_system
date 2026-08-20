import { Inject, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type {
  AuthUser,
  ChangePasswordRequest,
  CurrentUserResponse,
  Language,
  LoginRequest,
  RegisterRequest,
  RegisterResponse,
} from "@motorcycle-system/shared-types";
import { PrismaService } from "../prisma/prisma.service.js";
import { TokenStoreService } from "../token-store/token-store.service.js";
import { AppError } from "../common/errors/app-error.js";
import { REFRESH_TOKEN_TTL_SECONDS } from "../config/auth.config.js";
import { decodeToken, generateAccessToken, generateRefreshToken, verifyToken } from "../utils/jwt.js";
import { hashPassword, verifyPassword } from "../utils/password.js";

const authUserInclude = {
  include: {
    branch: {
      select: {
        id: true,
        nameAr: true,
        nameEn: true,
      },
    },
    role: {
      include: {
        permissions: true,
      },
    },
  },
} satisfies Prisma.UserDefaultArgs;

type AuthUserRecord = Prisma.UserGetPayload<typeof authUserInclude>;

@Injectable()
export class AuthService {
  private readonly prisma: PrismaService;
  private readonly tokenStore: TokenStoreService;

  constructor(
    @Inject(PrismaService) prisma: PrismaService,
    @Inject(TokenStoreService) tokenStore: TokenStoreService,
  ) {
    this.prisma = prisma;
    this.tokenStore = tokenStore;
  }

  async registerCustomer(input: RegisterRequest): Promise<RegisterResponse> {
    const email = input.email.toLowerCase();

    const [emailExists, phoneExists] = await Promise.all([
      this.prisma.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } } }),
      this.prisma.user.findFirst({ where: { phone: input.phone } }),
    ]);

    if (emailExists) {
      throw new AppError("EMAIL_EXISTS", 409, "Email already exists");
    }
    if (phoneExists) {
      throw new AppError("PHONE_EXISTS", 409, "Phone already exists");
    }

    const customerRole = await this.prisma.role.findUnique({ where: { name: "customer" } });
    if (!customerRole) {
      throw new AppError("ROLE_NOT_FOUND", 500, "Customer role is not configured");
    }

    const user = await this.prisma.user.create({
      data: {
        name: input.name,
        phone: input.phone,
        email,
        passwordHash: await hashPassword(input.password),
        roleId: customerRole.id,
        lang: "ar",
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
      },
    });

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone ?? input.phone,
    };
  }

  async login(input: LoginRequest, ip: string) {
    const email = input.email.toLowerCase();
    const user = await this.prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      ...authUserInclude,
    });

    if (!user) {
      this.logAuthEvent(null, "auth.login.failure", ip).catch(console.error);
      throw new AppError("INVALID_CREDENTIALS", 401, "Invalid credentials");
    }

    const passwordMatches = await verifyPassword(input.password, user.passwordHash);
    if (!passwordMatches) {
      this.logAuthEvent(user, "auth.login.failure", ip).catch(console.error);
      throw new AppError("INVALID_CREDENTIALS", 401, "Invalid credentials");
    }

    if (!user.isActive) {
      this.logAuthEvent(user, "auth.login.inactive", ip).catch(console.error);
      throw new AppError("ACCOUNT_INACTIVE", 403, "User account is inactive");
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const access = generateAccessToken(user.id);
    const refresh = generateRefreshToken(user.id);
    await this.tokenStore.saveRefreshToken(user.id, refresh.tokenId, refresh.token, refresh.expiresInSeconds);
    this.logAuthEvent(user, "auth.login.success", ip).catch(console.error);

    return {
      accessToken: access.token,
      refreshToken: refresh.token,
      user: this.toAuthUser(user),
    };
  }

  async refresh(refreshToken: string | undefined, ip: string) {
    if (!refreshToken) {
      throw new AppError("TOKEN_INVALID", 401, "Invalid or expired refresh token");
    }

    let payload;
    try {
      payload = verifyToken(refreshToken, "refresh");
    } catch {
      throw new AppError("TOKEN_INVALID", 401, "Invalid or expired refresh token");
    }

    if (await this.tokenStore.checkBlacklist(payload.jti)) {
      throw new AppError("TOKEN_INVALID", 401, "Invalid or expired refresh token");
    }

    const validStoredToken = await this.tokenStore.isRefreshTokenValid(payload.sub, payload.jti, refreshToken);
    if (!validStoredToken) {
      throw new AppError("TOKEN_INVALID", 401, "Invalid or expired refresh token");
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      ...authUserInclude,
    });

    if (!user) {
      throw new AppError("TOKEN_INVALID", 401, "Invalid or expired refresh token");
    }
    if (!user.isActive) {
      throw new AppError("ACCOUNT_INACTIVE", 403, "User account is inactive");
    }

    await this.blacklistRefreshToken(refreshToken, payload.jti);
    await this.tokenStore.deleteRefreshToken(user.id, payload.jti);

    const access = generateAccessToken(user.id);
    const refresh = generateRefreshToken(user.id);
    await this.tokenStore.saveRefreshToken(user.id, refresh.tokenId, refresh.token, refresh.expiresInSeconds);
    this.logAuthEvent(user, "auth.token.refresh", ip).catch(console.error);

    return {
      accessToken: access.token,
      refreshToken: refresh.token,
    };
  }

  async logout(userId: string, refreshToken: string | undefined) {
    if (!refreshToken) {
      return;
    }

    try {
      const payload = verifyToken(refreshToken, "refresh");
      if (payload.sub === userId) {
        await this.blacklistRefreshToken(refreshToken, payload.jti);
        await this.tokenStore.deleteRefreshToken(userId, payload.jti);
      }
    } catch {
      return;
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId }, ...authUserInclude });
    if (user) {
      this.logAuthEvent(user, "auth.logout", "unknown").catch(console.error);
    }
  }

  async getCurrentUser(userId: string): Promise<CurrentUserResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      ...authUserInclude,
    });

    if (!user) {
      throw new AppError("TOKEN_INVALID", 401, "Invalid or expired token");
    }
    if (!user.isActive) {
      throw new AppError("ACCOUNT_INACTIVE", 403, "User account is inactive");
    }

    return {
      ...this.toAuthUser(user),
      phone: user.phone,
      branch: user.branch,
      lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    };
  }

  async changePassword(userId: string, input: ChangePasswordRequest, currentRefreshToken?: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new AppError("TOKEN_INVALID", 401, "Invalid or expired token");
    }

    const passwordMatches = await verifyPassword(input.currentPassword, user.passwordHash);
    if (!passwordMatches) {
      throw new AppError("INCORRECT_PASSWORD", 401, "Current password is incorrect");
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await hashPassword(input.newPassword) },
    });

    let currentRefreshTokenId: string | undefined;
    if (currentRefreshToken) {
      try {
        const payload = verifyToken(currentRefreshToken, "refresh");
        if (payload.sub === userId) {
          currentRefreshTokenId = payload.jti;
        }
      } catch {
        currentRefreshTokenId = undefined;
      }
    }

    await this.tokenStore.deleteRefreshTokensForUser(userId, currentRefreshTokenId);
  }

  private async blacklistRefreshToken(token: string, tokenId: string) {
    const decoded = decodeToken(token);
    const ttlSeconds = decoded?.exp ? decoded.exp - Math.floor(Date.now() / 1000) : REFRESH_TOKEN_TTL_SECONDS;
    await this.tokenStore.blacklistToken(tokenId, ttlSeconds);
  }

  private toAuthUser(user: AuthUserRecord): AuthUser {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: {
        id: user.role.id,
        name: user.role.name,
        permissions: user.role.permissions.map((permission) => ({
          resource: permission.resource as AuthUser["role"]["permissions"][number]["resource"],
          action: permission.action as AuthUser["role"]["permissions"][number]["action"],
        })),
      },
      branchId: user.branchId,
      lang: user.lang as Language,
    };
  }

  private async logAuthEvent(user: AuthUserRecord | null, action: string, ip: string) {
    if (!user) {
      console.warn(`Auth event ${action} from ${ip}`);
      return;
    }

    await this.prisma.auditLog.create({
      data: {
        userId: user.id,
        action,
        entityType: "auth",
        entityId: user.id,
        branchId: user.branchId,
        after: { ip },
      },
    });
  }
}
