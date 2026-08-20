import { IsEnum, IsOptional, IsString, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { NotificationStatus, NotificationType } from '../notifications.types.js';

export class NotificationQueryDto {
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;

  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;

  @IsOptional()
  @IsEnum(NotificationStatus)
  status?: NotificationStatus;

  @IsOptional()
  @Type(() => Boolean)
  unreadOnly?: boolean;
}

export class MarkAsReadDto {
  @IsString({ each: true })
  notificationIds: string[];
}
