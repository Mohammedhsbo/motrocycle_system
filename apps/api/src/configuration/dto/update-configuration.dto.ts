import { IsString, IsEnum, IsOptional, IsBoolean, IsDate, IsObject, IsArray, ValidateNested, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ConfigDataType } from '../configuration.types.js';

export class ConfigurationUpdateItemDto {
  @IsString()
  configKey: string;

  @IsString()
  configValue: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  effectiveFrom?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  effectiveTo?: Date;
}

export class UpdateSystemConfigurationDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConfigurationUpdateItemDto)
  configurations: ConfigurationUpdateItemDto[];
}

export class UpdateCompanyConfigurationDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConfigurationUpdateItemDto)
  configurations: ConfigurationUpdateItemDto[];
}

export class UpdateBranchConfigurationDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConfigurationUpdateItemDto)
  configurations: ConfigurationUpdateItemDto[];
}

export class FeatureFlagUpdateDto {
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  rolloutPercentage?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetBranches?: string[];

  @IsOptional()
  @IsString()
  reason?: string;
}

export class DocumentNumberingUpdateDto {
  @IsOptional()
  @IsString()
  prefix?: string;

  @IsOptional()
  @IsBoolean()
  includeBranchCode?: boolean;

  @IsOptional()
  @IsBoolean()
  includeYear?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  sequenceLength?: number;

  @IsOptional()
  @IsEnum(['never', 'yearly', 'monthly'])
  resetPolicy?: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class WorkingHoursUpdateDto {
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek: number;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  openTime?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  closeTime?: Date;

  @IsOptional()
  @IsBoolean()
  isClosed?: boolean;

  @Type(() => Date)
  @IsDate()
  effectiveFrom: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  effectiveTo?: Date;
}

export class CreateHolidayDto {
  @IsString()
  holidayName: string;

  @Type(() => Date)
  @IsDate()
  holidayDate: Date;

  @IsEnum(['system', 'branch'])
  scope: string;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsBoolean()
  isRecurring?: boolean;

  @IsOptional()
  @IsString()
  recurrencePattern?: string;
}

export class ResetNumberingDto {
  @IsInt()
  @Min(0)
  newStartingNumber: number;

  @IsString()
  reason: string;

  @IsBoolean()
  confirmed: boolean;
}
