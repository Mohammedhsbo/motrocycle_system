import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import { ACCESS_TOKEN_TTL_SECONDS, REFRESH_TOKEN_TTL_SECONDS, getJwtSecret } from "../config/auth.config.js";

export type TokenType = "access" | "refresh";

export interface AuthTokenPayload {
  sub: string;
  jti: string;
  type: TokenType;
}

export interface GeneratedToken {
  token: string;
  tokenId: string;
  expiresInSeconds: number;
}

function signToken(userId: string, type: TokenType, expiresInSeconds: number): GeneratedToken {
  const tokenId = randomUUID();
  const token = jwt.sign(
    {
      sub: userId,
      jti: tokenId,
      type,
    },
    getJwtSecret(),
    { expiresIn: expiresInSeconds },
  );

  return { token, tokenId, expiresInSeconds };
}

export function generateAccessToken(userId: string) {
  return signToken(userId, "access", ACCESS_TOKEN_TTL_SECONDS);
}

export function generateRefreshToken(userId: string) {
  return signToken(userId, "refresh", REFRESH_TOKEN_TTL_SECONDS);
}

export function verifyToken(token: string, expectedType: TokenType): AuthTokenPayload {
  const decoded = jwt.verify(token, getJwtSecret()) as Partial<AuthTokenPayload>;

  if (!decoded.sub || !decoded.jti || decoded.type !== expectedType) {
    throw new Error("Invalid token payload");
  }

  return {
    sub: decoded.sub,
    jti: decoded.jti,
    type: decoded.type,
  };
}

export function decodeToken(token: string) {
  return jwt.decode(token) as (AuthTokenPayload & { exp?: number }) | null;
}
