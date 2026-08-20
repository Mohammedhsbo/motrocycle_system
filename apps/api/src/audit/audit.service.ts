import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service.js";

interface AuditInput {
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  branchId?: string | null;
  before?: Prisma.InputJsonValue;
  after?: Prisma.InputJsonValue;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(input: AuditInput) {
    await this.prisma.auditLog.create({
      data: {
        userId: input.userId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        branchId: input.branchId ?? null,
        before: input.before ?? undefined,
        after: input.after ?? undefined,
      },
    });
  }
}
