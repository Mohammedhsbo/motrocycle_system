import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service.js";
import type {
  FinancingCompanyCreate,
  FinancingCompanyUpdate,
  InstallmentDurationCreate,
  InstallmentDurationUpdate,
  InstallmentRequestCreate,
  InstallmentRequestReview,
  InstallmentCalculation,
  SettingsUpdate,
} from "./customer-financing.schemas.js";

@Injectable()
export class CustomerFinancingService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  listCompanies() {
    return this.prisma.financingCompany.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
  }

  listDurations() {
    return this.prisma.installmentDuration.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { months: "asc" }],
    });
  }

  getSettings() {
    return this.prisma.settings.findUnique({ where: { id: "default" } });
  }

  listAllCompanies() {
    return this.prisma.financingCompany.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
  }

  listAllDurations() {
    return this.prisma.installmentDuration.findMany({ orderBy: [{ sortOrder: "asc" }, { months: "asc" }] });
  }

  createCompany(input: FinancingCompanyCreate) {
    return this.prisma.financingCompany.create({ data: input });
  }

  updateCompany(id: string, input: FinancingCompanyUpdate) {
    return this.prisma.financingCompany.update({ where: { id }, data: input });
  }

  async deleteCompany(id: string) {
    const count = await this.prisma.installmentRequest.count({ where: { financingCompanyId: id } });
    if (count) throw new ConflictException("A financing company used by an application cannot be deleted; deactivate it instead.");
    return this.prisma.financingCompany.delete({ where: { id } });
  }

  createDuration(input: InstallmentDurationCreate) {
    return this.prisma.installmentDuration.create({ data: input });
  }

  updateDuration(id: string, input: InstallmentDurationUpdate) {
    return this.prisma.installmentDuration.update({ where: { id }, data: input });
  }

  async deleteDuration(id: string) {
    const count = await this.prisma.installmentRequest.count({ where: { installmentDurationId: id } });
    if (count) throw new ConflictException("A duration used by an application cannot be deleted; deactivate it instead.");
    return this.prisma.installmentDuration.delete({ where: { id } });
  }

  upsertSettings(input: SettingsUpdate) {
    return this.prisma.settings.upsert({ where: { id: "default" }, create: { id: "default", ...input }, update: input });
  }

  async createRequest(customerId: string, input: InstallmentRequestCreate) {
    const [motorcycle, company, duration] = await Promise.all([
      this.prisma.motorcycle.findUnique({ where: { id: input.motorcycleId }, select: { id: true, price: true, status: true } }),
      this.prisma.financingCompany.findFirst({ where: { id: input.financingCompanyId, isActive: true } }),
      this.prisma.installmentDuration.findFirst({ where: { id: input.installmentDurationId, isActive: true } }),
    ]);
    if (!motorcycle) throw new NotFoundException("Motorcycle not found");
    if (motorcycle.status !== "available") throw new ConflictException("Motorcycle is not available");
    if (!company) throw new NotFoundException("Financing company not found");
    if (!duration) throw new NotFoundException("Installment duration not found");
    const monthlyInstallment = this.calculateMonthlyInstallment(Number(motorcycle.price), input.downPayment, duration.months);

    return this.prisma.installmentRequest.create({
      data: {
        ...input,
        customerId,
        motorcyclePrice: motorcycle.price,
        monthlyInstallment,
        status: "pending",
      },
      include: { financingCompany: true, duration: true, motorcycle: { include: { brand: true } } },
    });
  }

  async calculate(input: InstallmentCalculation) {
    const [motorcycle, duration] = await Promise.all([
      this.prisma.motorcycle.findUnique({ where: { id: input.motorcycleId }, select: { price: true } }),
      this.prisma.installmentDuration.findFirst({ where: { id: input.installmentDurationId, isActive: true }, select: { months: true } }),
    ]);
    if (!motorcycle) throw new NotFoundException("Motorcycle not found");
    if (!duration) throw new NotFoundException("Installment duration not found");
    const price = Number(motorcycle.price);
    return {
      motorcyclePrice: price,
      downPayment: input.downPayment,
      financingAmount: Number((price - input.downPayment).toFixed(2)),
      months: duration.months,
      monthlyInstallment: this.calculateMonthlyInstallment(price, input.downPayment, duration.months),
    };
  }

  private calculateMonthlyInstallment(price: number, downPayment: number, months: number) {
    if (downPayment >= price) throw new BadRequestException("Down payment must be less than the motorcycle price");
    return Number(((price - downPayment) / months).toFixed(2));
  }

  listMine(customerId: string) {
    return this.prisma.installmentRequest.findMany({
      where: { customerId },
      orderBy: { createdAt: "desc" },
      include: { financingCompany: true, duration: true, motorcycle: { include: { brand: true } } },
    });
  }

  listRequests(status?: "pending" | "approved" | "rejected") {
    return this.prisma.installmentRequest.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: "desc" },
      include: { customer: true, financingCompany: true, duration: true, motorcycle: { include: { brand: true } } },
    });
  }

  reviewRequest(id: string, input: InstallmentRequestReview) {
    return this.prisma.installmentRequest.update({
      where: { id },
      data: { status: input.status, rejectionReason: input.status === "rejected" ? input.rejectionReason ?? null : null, reviewedAt: new Date() },
      include: { customer: true, financingCompany: true, duration: true, motorcycle: true },
    });
  }
}
