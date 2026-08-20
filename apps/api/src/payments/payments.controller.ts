import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
} from "@nestjs/common";
import {
  CreatePaymentRequest,
  ConfirmPaymentRequest,
  CancelPaymentRequest,
  PaymentStatus,
  PaymentMethod,
  createPaymentSchema,
  confirmPaymentSchema,
  cancelPaymentSchema,
  Resource,
  Action,
} from "@motorcycle-system/shared-types";
import { PaymentsService } from "./payments.service.js";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { PermissionsGuard } from "../auth/guards/permissions.guard.js";
import { RequirePermission } from "../auth/decorators/permissions.decorator.js";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe.js";
import type { AuthenticatedRequest } from "../common/types/authenticated-request.js";

@Controller("payments")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @RequirePermission(Resource.PAYMENTS, Action.CREATE)
  async create(
    @Body(new ZodValidationPipe(createPaymentSchema)) data: CreatePaymentRequest,
    @Req() req: AuthenticatedRequest
  ) {
    return this.paymentsService.create(
      data,
      req.user.id,
      req.user.branchId,
      req.user.isSuperAdmin
    );
  }

  @Get()
  @RequirePermission(Resource.PAYMENTS, Action.READ)
  async list(
    @Req() req: AuthenticatedRequest,
    @Query("customerId") customerId?: string,
    @Query("invoiceId") invoiceId?: string,
    @Query("status") status?: PaymentStatus,
    @Query("method") method?: PaymentMethod,
    @Query("branchId") branchId?: string,
    @Query("fromDate") fromDate?: string,
    @Query("toDate") toDate?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string
  ) {
    const filters = {
      customerId,
      invoiceId,
      status,
      method,
      branchId,
      fromDate: fromDate ? new Date(fromDate) : undefined,
      toDate: toDate ? new Date(toDate) : undefined,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    };

    return this.paymentsService.list(
      filters,
      req.user.id,
      req.user.branchId,
      req.user.isSuperAdmin
    );
  }

  @Get(":id")
  @RequirePermission(Resource.PAYMENTS, Action.READ)
  async findOne(@Param("id") id: string, @Req() req: AuthenticatedRequest) {
    return this.paymentsService.findById(
      id,
      req.user.id,
      req.user.branchId,
      req.user.isSuperAdmin
    );
  }

  @Patch(":id/confirm")
  @RequirePermission(Resource.PAYMENTS, Action.UPDATE)
  async confirm(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(confirmPaymentSchema)) data: ConfirmPaymentRequest,
    @Req() req: AuthenticatedRequest
  ) {
    return this.paymentsService.confirm(
      id,
      data,
      req.user.id,
      req.user.branchId,
      req.user.isSuperAdmin
    );
  }

  @Patch(":id/cancel")
  @RequirePermission(Resource.PAYMENTS, Action.UPDATE)
  async cancel(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(cancelPaymentSchema)) data: CancelPaymentRequest,
    @Req() req: AuthenticatedRequest
  ) {
    return this.paymentsService.cancel(
      id,
      data,
      req.user.id,
      req.user.branchId,
      req.user.isSuperAdmin
    );
  }

  @Get(":id/allocations")
  @RequirePermission(Resource.PAYMENTS, Action.READ)
  async getAllocations(
    @Param("id") id: string,
    @Req() req: AuthenticatedRequest
  ) {
    return this.paymentsService.getAllocations(
      id,
      req.user.id,
      req.user.branchId,
      req.user.isSuperAdmin
    );
  }
}
