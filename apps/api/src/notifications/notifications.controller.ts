import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { NotificationsService } from './notifications.service.js';
import { NotificationPreferenceService } from './notification-preference.service.js';
import { CreateNotificationDto } from './dto/create-notification.dto.js';
import { NotificationQueryDto, MarkAsReadDto } from './dto/notification-query.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RequirePermission } from '../auth/decorators/permissions.decorator.js';

interface AuthRequest extends Request {
  user: {
    userId: string;
    roleId: string;
    branchId?: string;
  };
}

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly preferenceService: NotificationPreferenceService,
  ) {}

  /**
   * Get all notifications for authenticated user
   */
  @Get()
  async findAll(@Req() req: AuthRequest, @Query() query: NotificationQueryDto) {
    return this.notificationsService.findAll(req.user.userId, query);
  }

  /**
   * Get unread count
   */
  @Get('unread-count')
  async getUnreadCount(@Req() req: AuthRequest) {
    const count = await this.notificationsService.getUnreadCount(req.user.userId);
    return { count };
  }

  /**
   * Mark notification as read
   */
  @Patch(':id/read')
  async markAsRead(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.notificationsService.markAsRead(id, req.user.userId);
  }

  /**
   * Mark multiple notifications as read
   */
  @Post('mark-read')
  async markManyAsRead(@Req() req: AuthRequest, @Body() dto: MarkAsReadDto) {
    return this.notificationsService.markManyAsRead(
      dto.notificationIds,
      req.user.userId,
    );
  }

  /**
   * Mark all notifications as read
   */
  @Post('mark-all-read')
  async markAllAsRead(@Req() req: AuthRequest) {
    return this.notificationsService.markAllAsRead(req.user.userId);
  }

  /**
   * Delete notification
   */
  @Delete(':id')
  async remove(@Req() req: AuthRequest, @Param('id') id: string) {
    return this.notificationsService.remove(id, req.user.userId);
  }

  /**
   * Get user notification preferences
   */
  @Get('preferences')
  async getPreferences(@Req() req: AuthRequest) {
    return this.preferenceService.getUserPreferences(req.user.userId);
  }

  /**
   * Update notification preferences
   */
  @Patch('preferences')
  async updatePreferences(
    @Req() req: AuthRequest,
    @Body()
    body: {
      preferences: Array<{
        type: string;
        channel: string;
        isEnabled: boolean;
      }>;
    },
  ) {
    return this.preferenceService.updateMultiplePreferences(
      req.user.userId,
      body.preferences as any,
    );
  }

  /**
   * Admin: Create notification (requires notification:create permission)
   */
  @Post()
  async create(@Body() dto: CreateNotificationDto) {
    return this.notificationsService.create(dto);
  }

  /**
   * Admin: Send bulk notifications (requires notification:create permission)
   */
  @Post('bulk')
  async createBulk(
    @Body() body: { notifications: CreateNotificationDto[] },
  ) {
    const results = await Promise.all(
      body.notifications.map((dto) => this.notificationsService.create(dto)),
    );
    return { created: results.length, notifications: results };
  }
}
