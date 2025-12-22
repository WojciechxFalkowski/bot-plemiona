import { Injectable, Logger, Inject, NotFoundException, BadRequestException, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Repository, IsNull } from 'typeorm';
import { parseAttackPlan, ParsedAttackBlock } from './operations/parse-attack-plan.operation';
import { ScheduledAttackEntity, ScheduledAttackStatus, ScheduledAttackType } from './entities/scheduled-attack.entity';
import { CreateScheduledAttackDto } from './dto/create-scheduled-attack.dto';
import { UpdateScheduledAttackDto } from './dto/update-scheduled-attack.dto';
import { SCHEDULED_ATTACKS_ENTITY_REPOSITORY, ScheduledAttacksServiceContracts } from './scheduled-attacks.service.contracts';
import { ServersService } from '@/servers/servers.service';
import { PlemionaCookiesService } from '@/plemiona-cookies';
import { PlemionaCredentials } from '@/utils/auth/auth.interfaces';
import { performAttackOperation, AttackConfig } from '@/crawler/operations/attacks/perform-attack.operation';
import { performSupportOperation } from '@/crawler/operations/attacks/perform-support.operation';
import { scheduleAttacksOperation, ScheduleAttacksDependencies } from './operations/schedule-attacks.operation';
import { executeScheduledAttackOperation, ExecuteScheduledAttackDependencies } from './operations/execute-scheduled-attack.operation';

@Injectable()
export class ScheduledAttacksService extends ScheduledAttacksServiceContracts {
  private readonly logger = new Logger(ScheduledAttacksService.name);

  private readonly credentials: PlemionaCredentials;

  constructor(
    @Inject(SCHEDULED_ATTACKS_ENTITY_REPOSITORY)
    private readonly scheduledAttacksRepository: Repository<ScheduledAttackEntity>,
    private readonly serversService: ServersService,
    @Inject(forwardRef(() => PlemionaCookiesService))
    private readonly plemionaCookiesService: PlemionaCookiesService,
    private readonly configService: ConfigService,
  ) {
    super();
    this.credentials = {
      username: this.configService.get<string>('PLEMIONA_USERNAME') || '',
    };
  }

  public async importAndSave(rawPlan: string, serverId: number, skipDuplicates: boolean = true): Promise<ScheduledAttackEntity[]> {
    this.logger.log(`Importing attack plan for server ${serverId} (skipDuplicates: ${skipDuplicates})`);
    await this.verifyServerExists(serverId);
    const parsedBlocks = parseAttackPlan(rawPlan, { logger: this.logger });
    if (parsedBlocks.length === 0) {
      throw new BadRequestException('No valid attacks found in the provided plan');
    }
    this.logger.debug(`Parsed ${parsedBlocks.length} attack blocks from raw plan`);
    return this.createManyFromPlan(parsedBlocks, serverId, skipDuplicates);
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

  public async createManyFromPlan(parsedBlocks: ParsedAttackBlock[], serverId: number, skipDuplicates: boolean = true): Promise<ScheduledAttackEntity[]> {
    const entitiesToSave: ScheduledAttackEntity[] = [];
    let skippedCount = 0;

    for (const parsed of parsedBlocks) {
      const attackType = this.mapParsedTypeToEntityType(parsed.attackType);

      // Check for duplicates if skipDuplicates is enabled
      if (skipDuplicates) {
        const existing = await this.findDuplicate(
          serverId,
          parsed.villageId,
          parsed.targetId,
          parsed.sendTimeFrom,
          parsed.sendTimeTo,
          attackType
        );
        if (existing) {
          this.logger.debug(
            `Skipping duplicate attack: serverId=${serverId}, villageId=${parsed.villageId}, targetId=${parsed.targetId}, sendTimeFrom=${parsed.sendTimeFrom.toISOString()}, attackType=${attackType}`
          );
          skippedCount++;
          continue;
        }
      }

      const entity = this.scheduledAttacksRepository.create({
        serverId,
        villageId: parsed.villageId,
        targetId: parsed.targetId,
        sourceCoordinates: parsed.sourceCoordinates,
        targetCoordinates: parsed.targetCoordinates,
        attackUrl: parsed.attackUrl,
        attackType,
        sendTimeFrom: parsed.sendTimeFrom,
        sendTimeTo: parsed.sendTimeTo,
        status: ScheduledAttackStatus.PENDING,
        description: parsed.description,
        metadata: parsed.metadata,
      });
      entitiesToSave.push(entity);
    }

    if (entitiesToSave.length === 0) {
      this.logger.warn(`All ${parsedBlocks.length} attacks were duplicates and skipped`);
      return [];
    }

    const saved = await this.scheduledAttacksRepository.save(entitiesToSave);
    this.logger.log(
      `Created ${saved.length} scheduled attacks for server ${serverId}${skippedCount > 0 ? `, skipped ${skippedCount} duplicates` : ''}`
    );
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

    // Check for duplicates
    const existing = await this.findDuplicate(
      createDto.serverId,
      createDto.villageId,
      createDto.targetId,
      createDto.sendTimeFrom,
      createDto.sendTimeTo,
      createDto.attackType
    );

    if (existing) {
      throw new BadRequestException(
        `Duplicate attack already exists: serverId=${createDto.serverId}, villageId=${createDto.villageId}, targetId=${createDto.targetId}, sendTimeFrom=${createDto.sendTimeFrom.toISOString()}, attackType=${createDto.attackType}`
      );
    }

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

  public async deleteAll(serverId?: number): Promise<number> {
    const where = serverId ? { serverId } : {};
    const result = await this.scheduledAttacksRepository.delete(where);
    const deletedCount = result.affected || 0;
    this.logger.log(`Deleted ${deletedCount} scheduled attacks${serverId ? ` for server ${serverId}` : ''}`);
    return deletedCount;
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

  public async scheduleAllAttacks(serverId: number): Promise<number> {
    await this.verifyServerExists(serverId);
    const deps: ScheduleAttacksDependencies = {
      scheduledAttacksRepository: this.scheduledAttacksRepository,
      executeScheduledAttackDeps: {
        scheduledAttacksRepository: this.scheduledAttacksRepository,
        serversService: this.serversService,
        performAttackOperation,
        performSupportOperation,
        credentials: this.credentials,
        plemionaCookiesService: this.plemionaCookiesService,
        logger: this.logger,
      },
      logger: this.logger,
    };
    return scheduleAttacksOperation(serverId, deps);
  }

  public async executeAttackNow(id: number): Promise<ScheduledAttackEntity> {
    const attack = await this.findById(id);
    const deps: ExecuteScheduledAttackDependencies = {
      scheduledAttacksRepository: this.scheduledAttacksRepository,
      serversService: this.serversService,
      performAttackOperation,
      performSupportOperation,
      credentials: this.credentials,
      plemionaCookiesService: this.plemionaCookiesService,
      logger: this.logger,
    };
    await executeScheduledAttackOperation(id, deps);
    return this.findById(id);
  }

  private mapEntityToAttackConfig(entity: ScheduledAttackEntity, serverCode: string): AttackConfig {
    return {
      id: entity.villageId || entity.id.toString(),
      link: entity.attackUrl,
      scheduleTime: 0,
      marchTime: 0,
      type: entity.attackType === ScheduledAttackType.SUPPORT ? 'support' : 'attack',
    };
  }

  /**
   * Finds a duplicate attack based on unique combination of fields
   * Duplicate = same serverId, villageId, targetId, sendTimeFrom, sendTimeTo, attackType
   */
  private async findDuplicate(
    serverId: number,
    villageId: string | undefined,
    targetId: string,
    sendTimeFrom: Date,
    sendTimeTo: Date,
    attackType: ScheduledAttackType
  ): Promise<ScheduledAttackEntity | null> {
    return this.scheduledAttacksRepository.findOne({
      where: {
        serverId,
        villageId: villageId ? villageId : IsNull(),
        targetId,
        sendTimeFrom,
        sendTimeTo,
        attackType,
      },
    });
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
