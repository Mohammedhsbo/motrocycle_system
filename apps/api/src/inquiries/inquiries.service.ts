import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";
import { StorageService } from "../upload/storage.service.js";
import type { AuthenticatedUser } from "../common/types/authenticated-request.js";


@Injectable()
export class InquiriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService
  ) {}

  async list() {
    return this.prisma.inquiry.findMany({
      include: {
        motorcycle: { include: { brand: true } },
        user: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async create(
    user: AuthenticatedUser,
    input: any,
    files: {
      documentImage?: Express.Multer.File;
      idCardFrontImage?: Express.Multer.File;
      idCardBackImage?: Express.Multer.File;
      guarantorIdFrontImage?: Express.Multer.File;
      guarantorIdBackImage?: Express.Multer.File;
      guarantorSignatureImage?: Express.Multer.File;
    }
  ) {
    const data: any = {
      customerName: input.customerName,
      customerPhone: input.customerPhone,
      documentType: input.documentType,
      downPayment: input.downPayment ? parseFloat(input.downPayment) : null,
      motorcycleId: input.motorcycleId || null,
      createdBy: user.id,
      branchId: user.branchId,
    };

    if (files.documentImage) {
      data.documentImage = (await this.storage.uploadFile(files.documentImage, "inquiries")).url;
    }
    if (files.idCardFrontImage) {
      data.idCardFrontImage = (await this.storage.uploadFile(files.idCardFrontImage, "inquiries")).url;
    }
    if (files.idCardBackImage) {
      data.idCardBackImage = (await this.storage.uploadFile(files.idCardBackImage, "inquiries")).url;
    }
    if (files.guarantorIdFrontImage) {
      data.guarantorIdFrontImage = (await this.storage.uploadFile(files.guarantorIdFrontImage, "inquiries")).url;
    }
    if (files.guarantorIdBackImage) {
      data.guarantorIdBackImage = (await this.storage.uploadFile(files.guarantorIdBackImage, "inquiries")).url;
    }
    if (files.guarantorSignatureImage) {
      data.guarantorSignatureImage = (await this.storage.uploadFile(files.guarantorSignatureImage, "inquiries")).url;
    }

    return this.prisma.inquiry.create({
      data,
      include: { motorcycle: { include: { brand: true } }, user: true },
    });
  }
}
