import { Injectable, Logger, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { parseAttackPlan, ParsedAttackBlock } from './operations/parse-attack-plan.operation';
import { ScheduledAttackEntity, ScheduledAttackStatus, ScheduledAttackType } from './entities/scheduled-attack.entity';
import { CreateScheduledAttackDto } from './dto/create-scheduled-attack.dto';
import { UpdateScheduledAttackDto } from './dto/update-scheduled-attack.dto';
import { SCHEDULED_ATTACKS_ENTITY_REPOSITORY, ScheduledAttacksServiceContracts } from './scheduled-attacks.service.contracts';
import { ServersService } from '@/servers/servers.service';

@Injectable()
export class ScheduledAttacksService extends ScheduledAttacksServiceContracts {
  private readonly logger = new Logger(ScheduledAttacksService.name);

  constructor(
    @Inject(SCHEDULED_ATTACKS_ENTITY_REPOSITORY)
    private readonly scheduledAttacksRepository: Repository<ScheduledAttackEntity>,
    private readonly serversService: ServersService,
  ) {
    super();
  }

  public async importAndSave(rawPlan: string, serverId: number): Promise<ScheduledAttackEntity[]> {
    this.logger.log(`Importing attack plan for server ${serverId}`);
    await this.verifyServerExists(serverId);
    const parsedBlocks = parseAttackPlan(rawPlan, { logger: this.logger });
    if (parsedBlocks.length === 0) {
      throw new BadRequestException('No valid attacks found in the provided plan');
    }
    this.logger.debug(`Parsed ${parsedBlocks.length} attack blocks from raw plan`);
    return this.createManyFromPlan(parsedBlocks, serverId);
  }

  public async createFromParsedBlock(parsedBlock: ParsedAttackBlock, serverId: number): Promise<ScheduledAttackEntity> {
    const createDto: CreateScheduledAttackDto = {
      serverId,
      villageId: parsedBlock.villageId,
      targetId: parsedBlock.targetId,
      sourceCoordinates: parsedBlock.sourceCoordinates,
      targetCoordinates: parsedBlock.targetCoordinates,
      attackUrl: parsedBlock.attackUrl,
      attackType: this.mapParsedTypeToEntityType(parsedBlock.attackType),
      sendTimeFrom: parsedBlock.sendTimeFrom,
      sendTimeTo: parsedBlock.sendTimeTo,
      description: parsedBlock.description,
      metadata: parsedBlock.metadata,
    };
    return this.create(createDto);
  }

  public async createManyFromPlan(parsedBlocks: ParsedAttackBlock[], serverId: number): Promise<ScheduledAttackEntity[]> {
    const entities = parsedBlocks.map((parsed) => {
      const entity = this.scheduledAttacksRepository.create({
        serverId,
        villageId: parsed.villageId,
        targetId: parsed.targetId,
        sourceCoordinates: parsed.sourceCoordinates,
        targetCoordinates: parsed.targetCoordinates,
        attackUrl: parsed.attackUrl,
        attackType: this.mapParsedTypeToEntityType(parsed.attackType),
        sendTimeFrom: parsed.sendTimeFrom,
        sendTimeTo: parsed.sendTimeTo,
        status: ScheduledAttackStatus.PENDING,
        description: parsed.description,
        metadata: parsed.metadata,
      });
      return entity;
    });
    const saved = await this.scheduledAttacksRepository.save(entities);
    this.logger.log(`Created ${saved.length} scheduled attacks for server ${serverId}`);
    return saved;
  }

  public async findAll(): Promise<ScheduledAttackEntity[]> {
    return this.scheduledAttacksRepository.find({
      relations: ['server'],
      order: { sendTimeFrom: 'ASC' },
    });
  }

  public async findById(id: number): Promise<ScheduledAttackEntity> {
    const attack = await this.scheduledAttacksRepository.findOne({
      where: { id },
      relations: ['server'],
    });
    if (!attack) {
      throw new NotFoundException(`Scheduled attack with ID ${id} not found`);
    }
    return attack;
  }

  public async findByServer(serverId: number): Promise<ScheduledAttackEntity[]> {
    await this.verifyServerExists(serverId);
    return this.scheduledAttacksRepository.find({
      where: { serverId },
      relations: ['server'],
      order: { sendTimeFrom: 'ASC' },
    });
  }

  public async findPendingByServer(serverId: number): Promise<ScheduledAttackEntity[]> {
    await this.verifyServerExists(serverId);
    return this.scheduledAttacksRepository.find({
      where: {
        serverId,
        status: ScheduledAttackStatus.PENDING,
      },
      relations: ['server'],
      order: { sendTimeFrom: 'ASC' },
    });
  }

  public async create(createDto: CreateScheduledAttackDto): Promise<ScheduledAttackEntity> {
    await this.verifyServerExists(createDto.serverId);
    const entity = this.scheduledAttacksRepository.create({
      ...createDto,
      status: ScheduledAttackStatus.PENDING,
    });
    return this.scheduledAttacksRepository.save(entity);
  }

  public async update(id: number, updateDto: UpdateScheduledAttackDto): Promise<ScheduledAttackEntity> {
    const attack = await this.findById(id);
    Object.assign(attack, updateDto);
    return this.scheduledAttacksRepository.save(attack);
  }

  public async delete(id: number): Promise<void> {
    const attack = await this.findById(id);
    await this.scheduledAttacksRepository.remove(attack);
    this.logger.log(`Deleted scheduled attack with ID ${id}`);
  }

  private async verifyServerExists(serverId: number): Promise<void> {
    try {
      await this.serversService.findById(serverId);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new NotFoundException(`Server with ID ${serverId} not found`);
      }
      throw error;
    }
  }

  private mapParsedTypeToEntityType(parsedType: ParsedAttackBlock['attackType']): ScheduledAttackType {
    const mapping: Record<ParsedAttackBlock['attackType'], ScheduledAttackType> = {
      off: ScheduledAttackType.OFF,
      fake: ScheduledAttackType.FAKE,
      nobleman: ScheduledAttackType.NOBLEMAN,
      support: ScheduledAttackType.SUPPORT,
    };
    return mapping[parsedType];
  }
}
