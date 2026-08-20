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
  CreateInvoiceRequest,
  UpdateInvoiceRequest,
  InvoiceStatus,
  createInvoiceSchema,
  updateInvoiceSchema,
  Resource,
  Action,
} from "@motorcycle-system/shared-types";
import { InvoicesService } from "./invoices.service.js";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { PermissionsGuard } from "../auth/guards/permissions.guard.js";
import { RequirePermission } from "../auth/decorators/permissions.decorator.js";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe.js";
import type { AuthenticatedRequest } from "../common/types/authenticated-request.js";

@Controller("invoices")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Post()
  @RequirePermission(Resource.INVOICES, Action.CREATE)
  async create(
    @Body(new ZodValidationPipe(createInvoiceSchema)) data: CreateInvoiceRequest,
    @Req() req: AuthenticatedRequest
  ) {
    return this.invoicesService.create(
      data,
      req.user.id,
      req.user.branchId,
      req.user.isSuperAdmin
    );
  }

  @Get()
  @RequirePermission(Resource.INVOICES, Action.READ)
  async list(
    @Req() req: AuthenticatedRequest,
    @Query("customerId") customerId?: string,
    @Query("orderId") orderId?: string,
    @Query("reservationId") reservationId?: string,
    @Query("status") status?: InvoiceStatus,
    @Query("branchId") branchId?: string,
    @Query("fromDate") fromDate?: string,
    @Query("toDate") toDate?: string,
    @Query("search") search?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string
  ) {
    const filters = {
      customerId,
      orderId,
      reservationId,
      status,
      branchId,
      fromDate: fromDate ? new Date(fromDate) : undefined,
      toDate: toDate ? new Date(toDate) : undefined,
      search,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    };

    return this.invoicesService.list(
      filters,
      req.user.id,
      req.user.branchId,
      req.user.isSuperAdmin,
      req.user.isCustomer,
      req.user.customerId
    );
  }

  @Get(":id")
  @RequirePermission(Resource.INVOICES, Action.READ)
  async findOne(@Param("id") id: string, @Req() req: AuthenticatedRequest) {
    return this.invoicesService.findById(
      id,
      req.user.id,
      req.user.branchId,
      req.user.isSuperAdmin,
      req.user.isCustomer,
      req.user.customerId
    );
  }

  @Patch(":id")
  @RequirePermission(Resource.INVOICES, Action.UPDATE)
  async update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateInvoiceSchema)) data: UpdateInvoiceRequest,
    @Req() req: AuthenticatedRequest
  ) {
    return this.invoicesService.update(
      id,
      data,
      req.user.id,
      req.user.branchId,
      req.user.isSuperAdmin
    );
  }

  @Post(":id/issue")
  @RequirePermission(Resource.INVOICES, Action.UPDATE)
  async issue(@Param("id") id: string, @Req() req: AuthenticatedRequest) {
    return this.invoicesService.issue(
      id,
      req.user.id,
      req.user.branchId,
      req.user.isSuperAdmin
    );
  }

  @Post(":id/cancel")
  @RequirePermission(Resource.INVOICES, Action.UPDATE)
  async cancel(
    @Param("id") id: string,
    @Body("reason") reason: string,
    @Req() req: AuthenticatedRequest
  ) {
    return this.invoicesService.cancel(
      id,
      reason,
      req.user.id,
      req.user.branchId,
      req.user.isSuperAdmin
    );
  }
}
