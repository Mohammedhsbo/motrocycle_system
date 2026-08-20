import {
  Inject,
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { MotorcyclesService } from './motorcycles.service.js';
import { RequirePermission } from '../auth/decorators/permissions.decorator.js';
import { Resource, Action } from '@motorcycle-system/shared-types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../auth/guards/permissions.guard.js';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe.js';
import type { AuthenticatedRequest } from '../common/types/authenticated-request.js';
import { 
  createMotorcycleRequestSchema, 
  updateMotorcycleRequestSchema,
  statusTransitionRequestSchema,
  listMotorcyclesQuerySchema,
  CreateMotorcycleRequest,
  UpdateMotorcycleRequest,
  StatusTransitionRequest,
  ListMotorcyclesQuery
} from '@motorcycle-system/shared-types';

@Controller('motorcycles')
export class MotorcyclesController {
  constructor(@Inject(MotorcyclesService) private readonly motorcyclesService: MotorcyclesService) {}

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission(Resource.MOTORCYCLE, Action.CREATE)
  async create(
    @Body(new ZodValidationPipe(createMotorcycleRequestSchema)) data: CreateMotorcycleRequest,
    @Req() req: AuthenticatedRequest
  ) {
    const isSuperAdmin = req.user.isSuperAdmin;
    const result = await this.motorcyclesService.create(data, req.user.id, req.user.branchId, isSuperAdmin);
    return { success: true, data: result };
  }

  @Get()
  // This endpoint might be public for customers (e-commerce) or authenticated for staff
  // Using an optional auth guard would be ideal, but for simplicity we assume it's publicly accessible
  // and we identify the user if token is present, else treat as customer.
  // Assuming a custom decorator or checking req.user manually. We'll use a basic approach.
  async findAll(
    @Query(new ZodValidationPipe(listMotorcyclesQuerySchema)) query: ListMotorcyclesQuery,
    @Req() req: any // req.user might be populated by a global middleware or auth guard if we make it optional
  ) {
    const isCustomer = !req.user || req.user.roleName === 'customer';
    const userBranchId = req.user?.branchId ?? null;
    const isSuperAdmin = req.user?.isSuperAdmin ?? false;
    
    const { items, meta } = await this.motorcyclesService.findAll(query, userBranchId, isSuperAdmin, isCustomer);
    return { success: true, data: items, meta };
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: any) {
    const isCustomer = !req.user || req.user.roleName === 'customer';
    const userBranchId = req.user?.branchId ?? null;
    const isSuperAdmin = req.user?.isSuperAdmin ?? false;

    const result = await this.motorcyclesService.findOne(id, userBranchId, isSuperAdmin, isCustomer);
    return { success: true, data: result };
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission(Resource.MOTORCYCLE, Action.UPDATE)
  async update(
    @Param('id') id: string, 
    @Body(new ZodValidationPipe(updateMotorcycleRequestSchema)) data: UpdateMotorcycleRequest,
    @Req() req: AuthenticatedRequest
  ) {
    const isSuperAdmin = req.user.isSuperAdmin;
    const result = await this.motorcyclesService.update(id, data, req.user.id, req.user.branchId, isSuperAdmin);
    return { success: true, data: result };
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission(Resource.MOTORCYCLE, Action.UPDATE)
  async updateStatus(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(statusTransitionRequestSchema)) data: StatusTransitionRequest,
    @Req() req: AuthenticatedRequest
  ) {
    const isSuperAdmin = req.user.isSuperAdmin;
    const result = await this.motorcyclesService.updateStatus(id, data.status, data.reason, req.user.id, req.user.branchId, isSuperAdmin);
    return { success: true, data: result };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission(Resource.MOTORCYCLE, Action.DELETE)
  async remove(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const isSuperAdmin = req.user.isSuperAdmin;
    await this.motorcyclesService.remove(id, req.user.id, req.user.branchId, isSuperAdmin);
    return { success: true, data: null };
  }
}
