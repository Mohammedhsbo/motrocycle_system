import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  Req,
} from "@nestjs/common";
import {
  InvoiceStatus,
  PaymentStatus,
  Resource,
  Action,
} from "@motorcycle-system/shared-types";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard.js";
import { PermissionsGuard } from "../auth/guards/permissions.guard.js";
import { RequirePermission } from "../auth/decorators/permissions.decorator.js";
import type { AuthenticatedRequest } from "../common/types/authenticated-request.js";
import { CustomersFinancialService } from "./customers-financial.service.js";

@Controller("customers/:customerId")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CustomersFinancialController {
  constructor(
    private readonly customersFinancialService: CustomersFinancialService
  ) {}

  @Get("invoices")
  @RequirePermission(Resource.INVOICES, Action.READ)
  async getCustomerInvoices(
    @Req() req: AuthenticatedRequest,
    @Param("customerId") customerId: string,
    @Query("status") status?: InvoiceStatus,
    @Query("fromDate") fromDate?: string,
    @Query("toDate") toDate?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string
  ) {
    const filters = {
      status,
      fromDate: fromDate ? new Date(fromDate) : undefined,
      toDate: toDate ? new Date(toDate) : undefined,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    };

    return this.customersFinancialService.getCustomerInvoices(
      customerId,
      filters,
      req.user.id,
      req.user.branchId,
      req.user.isSuperAdmin,
      req.user.isCustomer,
      req.user.customerId
    );
  }

  @Get("payments")
  @RequirePermission(Resource.PAYMENTS, Action.READ)
  async getCustomerPayments(
    @Req() req: AuthenticatedRequest,
    @Param("customerId") customerId: string,
    @Query("status") status?: PaymentStatus,
    @Query("fromDate") fromDate?: string,
    @Query("toDate") toDate?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string
  ) {
    const filters = {
      status,
      fromDate: fromDate ? new Date(fromDate) : undefined,
      toDate: toDate ? new Date(toDate) : undefined,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    };

    return this.customersFinancialService.getCustomerPayments(
      customerId,
      filters,
      req.user.id,
      req.user.branchId,
      req.user.isSuperAdmin,
      req.user.isCustomer,
      req.user.customerId
    );
  }

  @Get("financial-summary")
  @RequirePermission(Resource.INVOICES, Action.READ)
  async getCustomerFinancialSummary(
    @Param("customerId") customerId: string,
    @Req() req: AuthenticatedRequest
  ) {
    return this.customersFinancialService.getCustomerFinancialSummary(
      customerId,
      req.user.id,
      req.user.branchId,
      req.user.isSuperAdmin,
      req.user.isCustomer,
      req.user.customerId
    );
  }
}
