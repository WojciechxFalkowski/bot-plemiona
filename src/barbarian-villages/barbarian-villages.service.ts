import { Injectable, Inject, Logger, forwardRef } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Page } from 'playwright';
import { ConfigService } from '@nestjs/config';
import { BarbarianVillageEntity } from './entities/barbarian-village.entity';
import { BARBARIAN_VILLAGES_ENTITY_REPOSITORY } from './barbarian-villages.service.contracts';
import { CreateBarbarianVillageDto, CreateBarbarianVillageFromUrlDto, UpdateBarbarianVillageDto } from './dto';
import { AttackResult } from '@/utils/army/attack.utils';
import { PlemionaCredentials } from '@/utils/auth/auth.interfaces';
import { SettingsService } from '@/settings/settings.service';
import { PlemionaCookiesService } from '@/plemiona-cookies';
import { ServersService } from '@/servers';
import { MiniAttackStrategiesService } from '@/mini-attack-strategies';
import { MiniAttackStrategyResponseDto } from '@/mini-attack-strategies/dto';
import { ArmyUtils } from '@/utils/army/army.utils';
import { AttackUtils } from '@/utils/army/attack.utils';
import {
    findAllBarbarianVillagesOperation,
    findAllGlobalBarbarianVillagesOperation,
    findOneBarbarianVillageOperation,
    findAttackableVillagesOperation,
    getBarbarianVillagesCountOperation,
    getAttackableCountOperation,
    createBarbarianVillageOperation,
    createBarbarianVillageFromUrlOperation,
    createBulkBarbarianVillagesOperation,
    updateBarbarianVillageOperation,
    removeBarbarianVillageOperation,
    deleteAllForServerOperation,
    toggleCanAttackOperation,
    refreshBarbarianVillagesOperation,
    executeMiniAttacksForAllVillagesInServerOperation,
    executeMiniAttacksOperation
} from './operations';

@Injectable()
export class BarbarianVillagesService {
    private readonly logger = new Logger(BarbarianVillagesService.name);
    private readonly credentials: PlemionaCredentials;

    constructor(
        @Inject(BARBARIAN_VILLAGES_ENTITY_REPOSITORY)
        private readonly barbarianVillageRepository: Repository<BarbarianVillageEntity>,
        private readonly settingsService: SettingsService,
        private readonly plemionaCookiesService: PlemionaCookiesService,
        private readonly configService: ConfigService,
        @Inject(forwardRef(() => ServersService))
        private readonly serversService: ServersService,
        private readonly miniAttackStrategiesService: MiniAttackStrategiesService,
    ) {
        this.credentials = {
            username: this.configService.get<string>('PLEMIONA_USERNAME') || '',
        };
    }

    /**
     * Zwraca obiekt z wszystkimi zależnościami potrzebnymi przez operacje
     */
    private getDependencies() {
        return {
            barbarianVillageRepository: this.barbarianVillageRepository,
            serversService: this.serversService,
            plemionaCookiesService: this.plemionaCookiesService,
            credentials: this.credentials,
            miniAttackStrategiesService: this.miniAttackStrategiesService,
            armyUtils: ArmyUtils,
            attackUtils: AttackUtils,
            logger: this.logger
        };
    }

    async findAll(
        serverId: number,
        villageId?: string,
        coordinateX?: number,
        coordinateY?: number
    ): Promise<BarbarianVillageEntity[]> {
        return findAllBarbarianVillagesOperation(
            serverId,
            villageId,
            coordinateX,
            coordinateY,
            {
                barbarianVillageRepository: this.barbarianVillageRepository,
                logger: this.logger
            }
        );
    }

    /**
     * Returns all barbarian villages across servers. When canAttack is provided, filters by the flag.
     */
    async findAllGlobal(canAttack?: boolean): Promise<BarbarianVillageEntity[]> {
        return findAllGlobalBarbarianVillagesOperation(
            canAttack,
            {
                barbarianVillageRepository: this.barbarianVillageRepository,
                logger: this.logger
            }
        );
    }

    async findOne(serverId: number, target: string): Promise<BarbarianVillageEntity> {
        return findOneBarbarianVillageOperation(
            serverId,
            target,
            {
                barbarianVillageRepository: this.barbarianVillageRepository,
                logger: this.logger
            }
        );
    }

    async create(serverId: number, createBarbarianVillageDto: CreateBarbarianVillageDto): Promise<BarbarianVillageEntity> {
        return createBarbarianVillageOperation(
            serverId,
            createBarbarianVillageDto,
            {
                barbarianVillageRepository: this.barbarianVillageRepository,
                logger: this.logger
            }
        );
    }

    /**
     * Creates a barbarian village from a Plemiona URL
     * @param serverId - Server ID
     * @param createFromUrlDto - DTO containing the URL
     * @returns Created barbarian village entity
     */
    async createFromUrl(serverId: number, createFromUrlDto: CreateBarbarianVillageFromUrlDto): Promise<BarbarianVillageEntity> {
        return createBarbarianVillageFromUrlOperation(
            serverId,
            createFromUrlDto,
            {
                barbarianVillageRepository: this.barbarianVillageRepository,
                logger: this.logger
            }
        );
    }

    /**
     * Creates multiple barbarian villages in bulk
     * @param serverId - Server ID
     * @param villagesData - Array of village data to create
     * @returns Array of created barbarian village entities
     */
    async createBulk(
        serverId: number,
        villagesData: Array<{ target: string; villageId: string }>
    ): Promise<BarbarianVillageEntity[]> {
        return createBulkBarbarianVillagesOperation(
            serverId,
            villagesData,
            {
                barbarianVillageRepository: this.barbarianVillageRepository,
                logger: this.logger
            }
        );
    }

    async update(serverId: number, target: string, updateBarbarianVillageDto: UpdateBarbarianVillageDto): Promise<BarbarianVillageEntity> {
        return updateBarbarianVillageOperation(
            serverId,
            target,
            updateBarbarianVillageDto,
            {
                barbarianVillageRepository: this.barbarianVillageRepository,
                logger: this.logger
            }
        );
    }

    async remove(serverId: number, target: string): Promise<void> {
        return removeBarbarianVillageOperation(
            serverId,
            target,
            {
                barbarianVillageRepository: this.barbarianVillageRepository,
                logger: this.logger
            }
        );
    }

    async toggleCanAttack(serverId: number, target: string): Promise<BarbarianVillageEntity> {
        return toggleCanAttackOperation(
            serverId,
            target,
            {
                barbarianVillageRepository: this.barbarianVillageRepository,
                logger: this.logger
            }
        );
    }

    async findAttackableVillages(serverId: number, villageId: string): Promise<BarbarianVillageEntity[]> {
        return findAttackableVillagesOperation(
            serverId,
            villageId,
            {
                barbarianVillageRepository: this.barbarianVillageRepository,
                logger: this.logger
            }
        );
    }

    async executeMiniAttacksForAllVillagesInServer(serverId: number): Promise<AttackResult[]> {
        return executeMiniAttacksForAllVillagesInServerOperation(
            serverId,
            {
                serversService: this.serversService,
                plemionaCookiesService: this.plemionaCookiesService,
                credentials: this.credentials,
                barbarianVillageRepository: this.barbarianVillageRepository,
                armyUtils: ArmyUtils,
                attackUtils: AttackUtils,
                miniAttackStrategiesService: this.miniAttackStrategiesService,
                logger: this.logger
            }
        );
    }

    async executeMiniAttacks(serverId: number, villageId: string, page: Page, serverCode: string, strategy?: MiniAttackStrategyResponseDto): Promise<AttackResult[]> {
        return executeMiniAttacksOperation({
            page,
            serverId,
            villageId,
            serverCode,
            barbarianVillageRepository: this.barbarianVillageRepository,
            armyUtils: ArmyUtils,
            attackUtils: AttackUtils,
            miniAttackStrategiesService: this.miniAttackStrategiesService,
            logger: this.logger,
            strategy
        });
    }

    async refreshBarbarianVillages(serverId: number): Promise<{ added: number; updated: number; deleted: number }> {
        return refreshBarbarianVillagesOperation(
            serverId,
            {
                serversService: this.serversService,
                plemionaCookiesService: this.plemionaCookiesService,
                credentials: this.credentials,
                barbarianVillageRepository: this.barbarianVillageRepository,
                logger: this.logger
            }
        );
    }

    async getCount(serverId: number): Promise<number> {
        return getBarbarianVillagesCountOperation(
            serverId,
            {
                barbarianVillageRepository: this.barbarianVillageRepository
            }
        );
    }

    async getAttackableCount(serverId: number): Promise<number> {
        return getAttackableCountOperation(
            serverId,
            {
                barbarianVillageRepository: this.barbarianVillageRepository
            }
        );
    }

    async deleteAllForServer(serverId: number): Promise<void> {
        return deleteAllForServerOperation(
            serverId,
            {
                barbarianVillageRepository: this.barbarianVillageRepository,
                logger: this.logger
            }
        );
    }
}
