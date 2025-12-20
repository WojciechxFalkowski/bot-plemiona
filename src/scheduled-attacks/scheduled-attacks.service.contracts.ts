import { Injectable } from '@nestjs/common';
import { ScheduledAttackEntity } from './entities/scheduled-attack.entity';
import { CreateScheduledAttackDto } from './dto/create-scheduled-attack.dto';
import { UpdateScheduledAttackDto } from './dto/update-scheduled-attack.dto';

export const SCHEDULED_ATTACKS_ENTITY_REPOSITORY = 'SCHEDULED_ATTACKS_ENTITY_REPOSITORY';

@Injectable()
export abstract class ScheduledAttacksServiceContracts {
  abstract findAll(): Promise<ScheduledAttackEntity[]>;
  abstract findById(id: number): Promise<ScheduledAttackEntity>;
  abstract findByServer(serverId: number): Promise<ScheduledAttackEntity[]>;
  abstract findPendingByServer(serverId: number): Promise<ScheduledAttackEntity[]>;
  abstract create(createDto: CreateScheduledAttackDto): Promise<ScheduledAttackEntity>;
  abstract update(id: number, updateDto: UpdateScheduledAttackDto): Promise<ScheduledAttackEntity>;
  abstract delete(id: number): Promise<void>;
}

