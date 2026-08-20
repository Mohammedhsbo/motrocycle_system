import {
  Controller,
  Get,
  Patch,
  Put,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiParam } from '@nestjs/swagger';
import { Request } from 'express';
import { Resource, Action } from '@motorcycle-system/shared-types';
import { ConfigurationService } from './configuration.service.js';
import { FeatureFlagService } from './feature-flag.service.js';
import { ConfigurationAdminService } from './configuration-admin.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RequirePermission } from '../auth/decorators/permissions.decorator.js';
import {
  UpdateSystemConfigurationDto,
  UpdateCompanyConfigurationDto,
  UpdateBranchConfigurationDto,
  FeatureFlagUpdateDto,
  DocumentNumberingUpdateDto,
  ResetNumberingDto,
  WorkingHoursUpdateDto,
  CreateHolidayDto,
} from './dto/update-configuration.dto.js';
import {
  ConfigurationQueryDto,
  ResolvedConfigurationQueryDto,
  FeatureFlagQueryDto,
  DocumentNumberingQueryDto,
  ConfigurationAuditQueryDto,
} from './dto/query-configuration.dto.js';

interface AuthRequest extends Request {
  user: {
    userId: string;
    roleId: string;
    branchId?: string;
  };
}

@Controller('admin/config')
@UseGuards(JwtAuthGuard)
@ApiTags('Configuration Management')
@ApiBearerAuth()
export class ConfigurationAdminController {
  constructor(
    private readonly configService: ConfigurationService,
    private readonly featureFlagService: FeatureFlagService,
    private readonly adminService: ConfigurationAdminService,
    private readonly prisma: PrismaService,
  ) {}

  // System Configuration
  @Get('system')
  @RequirePermission(Resource.CONFIGURATION, Action.READ)
  @ApiOperation({ summary: 'Get system-level configuration', description: 'Retrieve all system configuration settings. Requires super_admin permission.' })
  @ApiQuery({ name: 'category', required: false, description: 'Filter by configuration category' })
  @ApiResponse({ status: 200, description: 'System configuration retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - insufficient permissions' })
  async getSystemConfiguration(@Query() query: ConfigurationQueryDto) {
    return this.adminService.getSystemConfiguration(query);
  }

  @Patch('system')
  @RequirePermission(Resource.CONFIGURATION, Action.UPDATE)
  async updateSystemConfiguration(
    @Req() req: AuthRequest,
    @Body() dto: UpdateSystemConfigurationDto,
  ) {
    return this.adminService.updateSystemConfiguration(dto, req.user.userId, req.ip, req.get('user-agent'));
  }

  @Get('schema')
  async getConfigurationSchema() {
    return this.configService.getAllMetadata();
  }

  // Company Configuration
  @Get('company')
  @RequirePermission(Resource.CONFIGURATION, Action.READ)
  async getCompanyConfiguration(@Query() query: ConfigurationQueryDto) {
    return this.adminService.getCompanyConfiguration(query);
  }

  @Patch('company')
  @RequirePermission(Resource.CONFIGURATION, Action.UPDATE)
  async updateCompanyConfiguration(
    @Req() req: AuthRequest,
    @Body() dto: UpdateCompanyConfigurationDto,
  ) {
    return this.adminService.updateCompanyConfiguration(dto, req.user.userId, req.ip, req.get('user-agent'));
  }

  // Branch Configuration
  @Get('branches/:branchId')
  async getBranchConfiguration(
    @Req() req: AuthRequest,
    @Param('branchId') branchId: string,
  ) {
    // TODO: Add branch access control
    return this.adminService.getBranchConfiguration(branchId);
  }

  @Patch('branches/:branchId')
  async updateBranchConfiguration(
    @Req() req: AuthRequest,
    @Param('branchId') branchId: string,
    @Body() dto: UpdateBranchConfigurationDto,
  ) {
    // TODO: Add branch access control
    return this.adminService.updateBranchConfiguration(branchId, dto, req.user.userId, req.ip, req.get('user-agent'));
  }

  @Get('branches')
  @RequirePermission(Resource.CONFIGURATION, Action.READ)
  async listBranchConfigurations() {
    return this.adminService.listAllBranchConfigurations();
  }

  // Feature Flags
  @Get('feature-flags')
  async listFeatureFlags(@Query() query: FeatureFlagQueryDto) {
    return this.featureFlagService.getAllFlags(query.scope, query.enabled_only);
  }

  @Patch('feature-flags/:flagKey')
  @RequirePermission(Resource.CONFIGURATION, Action.UPDATE)
  async updateFeatureFlag(
    @Req() req: AuthRequest,
    @Param('flagKey') flagKey: string,
    @Body() dto: FeatureFlagUpdateDto,
  ) {
    return this.featureFlagService.updateFlag(flagKey, dto, req.user.userId);
  }

  @Post('feature-flags')
  @RequirePermission(Resource.CONFIGURATION, Action.CREATE)
  async createFeatureFlag(
    @Req() req: AuthRequest,
    @Body() dto: any,
  ) {
    return this.featureFlagService.createFlag(dto, req.user.userId);
  }

  // Document Numbering
  @Get('numbering')
  async getNumberingConfiguration(@Query() query: DocumentNumberingQueryDto) {
    return this.adminService.getDocumentNumbering(query.document_type, query.branch);
  }

  @Patch('numbering/:documentType')
  @RequirePermission(Resource.CONFIGURATION, Action.UPDATE)
  async updateNumberingConfiguration(
    @Req() req: AuthRequest,
    @Param('documentType') documentType: string,
    @Body() dto: DocumentNumberingUpdateDto,
  ) {
    return this.adminService.updateDocumentNumbering(documentType, dto, req.user.userId, req.ip, req.get('user-agent'));
  }

  @Post('numbering/:documentType/reset')
  @RequirePermission(Resource.CONFIGURATION, Action.UPDATE)
  async resetDocumentSequence(
    @Req() req: AuthRequest,
    @Param('documentType') documentType: string,
    @Body() dto: ResetNumberingDto,
  ) {
    return this.adminService.resetDocumentSequence(documentType, dto, req.user.userId, req.ip, req.get('user-agent'));
  }

  // Working Hours
  @Get('working-hours/:branchId')
  async getWorkingHours(@Param('branchId') branchId: string) {
    return this.adminService.getWorkingHours(branchId);
  }

  @Put('working-hours/:branchId')
  async updateWorkingHours(
    @Req() req: AuthRequest,
    @Param('branchId') branchId: string,
    @Body() dto: WorkingHoursUpdateDto[],
  ) {
    return this.adminService.updateWorkingHours(branchId, dto, req.user.userId);
  }

  // Holidays
  @Get('holidays')
  async listHolidays(@Query('branch_id') branchId?: string) {
    return this.adminService.getHolidays(branchId);
  }

  @Post('holidays')
  @RequirePermission(Resource.CONFIGURATION, Action.CREATE)
  async createHoliday(
    @Req() req: AuthRequest,
    @Body() dto: CreateHolidayDto,
  ) {
    return this.adminService.createHoliday(dto, req.user.userId);
  }

  @Delete('holidays/:id')
  @RequirePermission(Resource.CONFIGURATION, Action.DELETE)
  async deleteHoliday(@Param('id') id: string) {
    return this.adminService.deleteHoliday(id);
  }

  // Configuration Audit
  @Get('audit')
  @RequirePermission(Resource.CONFIGURATION, Action.READ)
  async getConfigurationAudit(@Query() query: ConfigurationAuditQueryDto) {
    return this.adminService.getConfigurationAudit(query);
  }

  // Configuration Statistics
  @Get('stats')
  @RequirePermission(Resource.CONFIGURATION, Action.READ)
  async getConfigurationStats() {
    const [
      systemCount,
      companyCount,
      branchCount,
      featureFlagCount,
      recentChanges,
    ] = await Promise.all([
      this.prisma.systemConfiguration.count({ where: { isActive: true } }),
      this.prisma.companyConfiguration.count({ where: { isActive: true } }),
      this.prisma.branchConfiguration.count({ where: { isActive: true } }),
      this.prisma.featureFlag.count(),
      this.prisma.configurationAudit.count({
        where: {
          changeTimestamp: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
          },
        },
      }),
    ]);

    const enabledFlags = await this.prisma.featureFlag.count({ where: { isEnabled: true } });

    return {
      systemConfigurations: systemCount,
      companyConfigurations: companyCount,
      branchConfigurations: branchCount,
      totalFeatureFlags: featureFlagCount,
      enabledFeatureFlags: enabledFlags,
      recentChangesLast7Days: recentChanges,
    };
  }
}

@Controller('config')
@UseGuards(JwtAuthGuard)
@ApiTags('Configuration (User)')
@ApiBearerAuth()
export class ConfigurationController {
  constructor(
    private readonly configService: ConfigurationService,
    private readonly featureFlagService: FeatureFlagService,
  ) {}

  /**
   * Get resolved configuration for current user context
   */
  @Get('resolved')
  async getResolvedConfiguration(
    @Req() req: AuthRequest,
    @Query() query: ResolvedConfigurationQueryDto,
  ) {
    const branchId = query.branch_override ? undefined : req.user.branchId;

    if (query.keys && query.keys.length > 0) {
      const result: Record<string, any> = {};
      for (const key of query.keys) {
        try {
          result[key] = await this.configService.getValue(key, branchId);
        } catch {
          // Skip missing keys
        }
      }
      return result;
    }

    // Return all configuration
    const systemConfig = await this.configService.getAllConfiguration('system' as any);
    const companyConfig = await this.configService.getAllConfiguration('company' as any);
    const branchConfig = branchId ? await this.configService.getAllConfiguration('branch' as any, branchId) : {};

    return {
      ...systemConfig,
      ...companyConfig,
      ...branchConfig,
    };
  }

  /**
   * Get single configuration value
   */
  @Get('value/:key')
  async getConfigurationValue(
    @Req() req: AuthRequest,
    @Param('key') key: string,
  ) {
    const value = await this.configService.getValueWithMeta(key, req.user.branchId);
    return value;
  }

  /**
   * Check feature flag status
   */
  @Get('feature/:flagKey/status')
  async checkFeatureFlagStatus(
    @Req() req: AuthRequest,
    @Param('flagKey') flagKey: string,
  ) {
    const isEnabled = await this.featureFlagService.isFeatureEnabled(
      flagKey,
      req.user.branchId,
      req.user.userId,
    );

    return { flagKey, isEnabled };
  }
}
