import { ApiProperty } from '@nestjs/swagger';
import { ScheduledAttackType, ScheduledAttackStatus } from '../entities/scheduled-attack.entity';

export class ScheduledAttackResponseDto {
  @ApiProperty({ description: 'ID', type: Number })
  id: number;

  @ApiProperty({ description: 'Server ID', type: Number })
  serverId: number;

  @ApiProperty({ description: 'Village ID (source village)', required: false, type: String })
  villageId?: string;

  @ApiProperty({ description: 'Target village ID', type: String })
  targetId: string;

  @ApiProperty({ description: 'Source coordinates', type: String })
  sourceCoordinates: string;

  @ApiProperty({ description: 'Target coordinates', type: String })
  targetCoordinates: string;

  @ApiProperty({ description: 'Attack URL', type: String })
  attackUrl: string;

  @ApiProperty({ description: 'Attack type', enum: ScheduledAttackType })
  attackType: ScheduledAttackType;

  @ApiProperty({ description: 'Earliest send time', type: Date })
  sendTimeFrom: Date;

  @ApiProperty({ description: 'Latest send time', type: Date })
  sendTimeTo: Date;

  @ApiProperty({ description: 'Status', enum: ScheduledAttackStatus })
  status: ScheduledAttackStatus;

  @ApiProperty({ description: 'Optional description', required: false, type: String })
  description?: string;

  @ApiProperty({ description: 'Optional metadata', required: false, type: Object })
  metadata?: Record<string, unknown>;

  @ApiProperty({ description: 'Execution timestamp', required: false, type: Date })
  executedAt?: Date;

  @ApiProperty({ description: 'Error message', required: false, type: String })
  errorMessage?: string;

  @ApiProperty({ description: 'Created at', type: Date })
  createdAt: Date;

  @ApiProperty({ description: 'Updated at', type: Date })
  updatedAt: Date;
}

