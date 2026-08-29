import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";
import { StorageService } from "../upload/storage.service.js";
import type { AuthenticatedUser } from "../common/types/authenticated-request.js";

@Injectable()
export class SalesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService
  ) {}

  async list(branchId?: string) {
    return this.prisma.sale.findMany({
      where: branchId ? { branchId } : undefined,
      include: {
        motorcycle: { include: { brand: true } },
        user: true,
        branch: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async get(id: string) {
    return this.prisma.sale.findUnique({
      where: { id },
      include: {
        motorcycle: { include: { brand: true } },
        user: true,
        branch: true,
      },
    });
  }

  async create(
    user: AuthenticatedUser,
    input: {
      motorcycleId: string;
      customerName: string;
      customerPhone: string;
      salePrice: number;
      paymentMethod: "CASH" | "VISA";
    },
    idImageFile?: Express.Multer.File
  ) {
    let customerIdImage: string | undefined;
    if (idImageFile) {
      const result = await this.storage.uploadFile(idImageFile, "sales/id-images");
      customerIdImage = result.url;
    }

    return this.prisma.sale.create({
      data: {
        motorcycleId: input.motorcycleId,
        customerName: input.customerName,
        customerPhone: input.customerPhone,
        salePrice: input.salePrice,
        paymentMethod: input.paymentMethod,
        customerIdImage,
        branchId: user.branchId,
        createdBy: user.id,
      },
      include: {
        motorcycle: { include: { brand: true } },
        user: true,
        branch: true,
      },
    });
  }
}
