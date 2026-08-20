import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  ParseUUIDPipe,
} from '@nestjs/common';
import { POSService } from './pos.service.js';
import { OfflineService } from './offline.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../auth/guards/permissions.guard.js';
import { RequirePermission } from '../auth/decorators/permissions.decorator.js';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import {
  Resource,
  Action,
  posCustomerSearchSchema,
  posMotorcycleSearchSchema,
  validatePOSTransactionSchema,
  createPOSTransactionSchema,
  posActiveReservationsQuerySchema,
  convertPOSReservationSchema,
  queueOfflineOperationSchema,
  type POSCustomerSearchQuery,
  type POSMotorcycleSearchQuery,
  type ValidatePOSTransactionDto,
  type CreatePOSTransactionDto,
  type POSActiveReservationsQuery,
  type ConvertPOSReservationDto,
  type QueueOfflineOperationDto,
} from '@motorcycle-system/shared-types';
import type { AuthenticatedRequest } from '../common/types/authenticated-request.js';

@Controller('pos')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class POSController {
  constructor(
    private readonly posService: POSService,
    private readonly offlineService: OfflineService,
  ) {}

  @Get('dashboard')
  @RequirePermission(Resource.ORDER, Action.READ)
  async getDashboard(@Req() req: AuthenticatedRequest) {
    const data = await this.posService.getDashboard(req.user);
    return {
      success: true,
      data,
    };
  }

  @Get('customers/search')
  @RequirePermission(Resource.CUSTOMER, Action.READ)
  async searchCustomers(
    @Query(new ZodValidationPipe(posCustomerSearchSchema)) query: POSCustomerSearchQuery,
  ) {
    const data = await this.posService.searchCustomers(query);
    return {
      success: true,
      data,
    };
  }

  @Get('motorcycles/search')
  @RequirePermission(Resource.MOTORCYCLE, Action.READ)
  async searchMotorcycles(
    @Query(new ZodValidationPipe(posMotorcycleSearchSchema)) query: POSMotorcycleSearchQuery,
    @Req() req: AuthenticatedRequest,
  ) {
    const data = await this.posService.searchMotorcycles(query, req.user);
    return {
      success: true,
      data,
    };
  }

  @Post('validate-transaction')
  @RequirePermission(Resource.ORDER, Action.CREATE)
  async validateTransaction(
    @Body(new ZodValidationPipe(validatePOSTransactionSchema)) dto: ValidatePOSTransactionDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const data = await this.posService.validateTransaction(dto, req.user);
    return {
      success: true,
      data,
    };
  }

  @Post('transactions')
  @RequirePermission(Resource.ORDER, Action.CREATE)
  async createTransaction(
    @Body(new ZodValidationPipe(createPOSTransactionSchema)) dto: CreatePOSTransactionDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const data = await this.posService.createTransaction(dto, req.user);
    return {
      success: true,
      data,
    };
  }

  @Get('reservations/active')
  @RequirePermission(Resource.RESERVATION, Action.READ)
  async getActiveReservations(
    @Query(new ZodValidationPipe(posActiveReservationsQuerySchema))
    query: POSActiveReservationsQuery,
    @Req() req: AuthenticatedRequest,
  ) {
    const data = await this.posService.getActiveReservations(query, req.user);
    return {
      success: true,
      data,
    };
  }

  @Post('reservations/:id/convert')
  @RequirePermission(Resource.RESERVATION, Action.UPDATE)
  async convertReservation(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(convertPOSReservationSchema)) dto: ConvertPOSReservationDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const data = await this.posService.convertReservation(id, dto, req.user);
    return {
      success: true,
      data,
    };
  }

  @Get('offline/sync-status')
  @RequirePermission(Resource.ORDER, Action.READ)
  async getOfflineSyncStatus(@Req() req: AuthenticatedRequest) {
    const data = await this.offlineService.getSyncStatus(req.user.id);
    return {
      success: true,
      data,
    };
  }

  @Post('offline/queue')
  @RequirePermission(Resource.CUSTOMER, Action.CREATE)
  async queueOfflineOperation(
    @Body(new ZodValidationPipe(queueOfflineOperationSchema)) dto: QueueOfflineOperationDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const data = await this.offlineService.queueOperation(dto, req.user);
    return {
      success: true,
      data,
    };
  }

  @Get('offline/queue')
  @RequirePermission(Resource.ORDER, Action.READ)
  async getQueuedOperations(@Req() req: AuthenticatedRequest) {
    const data = await this.offlineService.getQueuedOperations(req.user.id);
    return {
      success: true,
      data,
    };
  }
}
