import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsDate, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ScheduledAttackType, ScheduledAttackStatus } from '../entities/scheduled-attack.entity';

export class UpdateScheduledAttackDto {
  @ApiProperty({ description: 'Earliest send time', required: false, type: Date })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  sendTimeFrom?: Date;

  @ApiProperty({ description: 'Latest send time', required: false, type: Date })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  sendTimeTo?: Date;

  @ApiProperty({ description: 'Status', required: false, enum: ScheduledAttackStatus })
  @IsOptional()
  @IsEnum(ScheduledAttackStatus)
  status?: ScheduledAttackStatus;

  @ApiProperty({ description: 'Optional description', required: false, type: String })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Optional metadata', required: false, type: Object })
  @IsOptional()
  metadata?: Record<string, unknown>;

  @ApiProperty({ description: 'Error message (if execution failed)', required: false, type: String })
  @IsOptional()
  @IsString()
  errorMessage?: string;

  @ApiProperty({ description: 'Execution timestamp', required: false, type: Date })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  executedAt?: Date;
}

