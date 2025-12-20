import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, IsDate, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ScheduledAttackType } from '../entities/scheduled-attack.entity';

export class CreateScheduledAttackDto {
  @ApiProperty({ description: 'Server ID', type: Number })
  @IsNumber()
  @IsNotEmpty()
  serverId!: number;

  @ApiProperty({ description: 'Village ID (source village)', type: String })
  @IsString()
  @IsNotEmpty()
  villageId!: string;

  @ApiProperty({ description: 'Target village ID', type: String })
  @IsString()
  @IsNotEmpty()
  targetId!: string;

  @ApiProperty({ description: 'Source coordinates (e.g., "650|449")', type: String })
  @IsString()
  @IsNotEmpty()
  sourceCoordinates!: string;

  @ApiProperty({ description: 'Target coordinates (e.g., "563|481")', type: String })
  @IsString()
  @IsNotEmpty()
  targetCoordinates!: string;

  @ApiProperty({ description: 'Attack URL', type: String })
  @IsString()
  @IsNotEmpty()
  attackUrl!: string;

  @ApiProperty({ description: 'Attack type', enum: ScheduledAttackType })
  @IsEnum(ScheduledAttackType)
  @IsNotEmpty()
  attackType!: ScheduledAttackType;

  @ApiProperty({ description: 'Earliest send time', type: Date })
  @IsDate()
  @Type(() => Date)
  @IsNotEmpty()
  sendTimeFrom!: Date;

  @ApiProperty({ description: 'Latest send time', type: Date })
  @IsDate()
  @Type(() => Date)
  @IsNotEmpty()
  sendTimeTo!: Date;

  @ApiProperty({ description: 'Optional description (e.g., "100 off", "50k na ZAGRODA")', required: false, type: String })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Optional metadata (building, resources, etc.)', required: false, type: Object })
  @IsOptional()
  metadata?: Record<string, unknown>;
}

