import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
  Req,
} from '@nestjs/common';
import { TransfersService } from './transfers.service.js';
import {
  CreateTransferRequest,
  createTransferSchema,
  Resource,
  Action,
} from '@motorcycle-system/shared-types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../auth/guards/permissions.guard.js';
import { RequirePermission } from '../auth/decorators/permissions.decorator.js';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import type { Request } from 'express';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    branchId: string | null;
    role: { name: string };
  };
}

@Controller('transfers')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TransfersController {
  constructor(private readonly transfersService: TransfersService) {}

  @Post()
  @RequirePermission(Resource.TRANSFER, Action.CREATE)
  async create(
    @Body(new ZodValidationPipe(createTransferSchema)) data: CreateTransferRequest,
    @Req() req: AuthenticatedRequest,
  ) {
    const isSuperAdmin = req.user.role.name === 'super_admin';
    const transfer = await this.transfersService.create(data, req.user.id, req.user.branchId, isSuperAdmin);
    return { success: true, data: transfer };
  }

  @Get()
  @RequirePermission(Resource.TRANSFER, Action.READ)
  async findAll(
    @Req() req: AuthenticatedRequest,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('search') search?: string,
    @Query('fromBranchId') fromBranchId?: string,
    @Query('toBranchId') toBranchId?: string,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const isSuperAdmin = req.user.role.name === 'super_admin';
    const result = await this.transfersService.findAll({
      page, limit, search, fromBranchId, toBranchId, status, startDate, endDate,
      userBranchId: req.user.branchId,
      isSuperAdmin,
    });
    return { success: true, ...result };
  }

  @Get(':id')
  @RequirePermission(Resource.TRANSFER, Action.READ)
  async findOne(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const isSuperAdmin = req.user.role.name === 'super_admin';
    const transfer = await this.transfersService.findOne(id, req.user.branchId, isSuperAdmin);
    return { success: true, data: transfer };
  }

  @Post(':id/ship')
  @RequirePermission(Resource.TRANSFER, Action.UPDATE)
  async ship(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const isSuperAdmin = req.user.role.name === 'super_admin';
    const result = await this.transfersService.ship(id, req.user.id, req.user.branchId, isSuperAdmin);
    return { success: true, data: result };
  }

  @Post(':id/receive')
  @RequirePermission(Resource.TRANSFER, Action.UPDATE)
  async receive(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const isSuperAdmin = req.user.role.name === 'super_admin';
    const result = await this.transfersService.receive(id, req.user.id, req.user.branchId, isSuperAdmin);
    return { success: true, data: result };
  }

  @Post(':id/cancel')
  @RequirePermission(Resource.TRANSFER, Action.DELETE)
  async cancel(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const isSuperAdmin = req.user.role.name === 'super_admin';
    const result = await this.transfersService.cancel(id, req.user.id, req.user.branchId, isSuperAdmin);
    return { success: true, data: result };
  }
}
