import { Injectable, Logger, Inject, OnModuleInit, OnModuleDestroy, forwardRef } from '@nestjs/common';
import { Repository } from 'typeorm';
import { VillageConstructionQueueEntity } from './entities/village-construction-queue.entity';
import { VillageEntity } from '../villages/entities/village.entity';
import { CreateConstructionQueueDto } from './dto/create-construction-queue.dto';
import { VILLAGE_CONSTRUCTION_QUEUE_ENTITY_REPOSITORY } from './village-construction-queue.service.contracts';
import { VILLAGES_ENTITY_REPOSITORY } from '../villages/villages.service.contracts';
import { ConfigService } from '@nestjs/config';
import { VillagesService } from '@/villages/villages.service';
import { PlemionaCredentials } from '@/utils/auth/auth.interfaces';
import { PlemionaCookiesService } from '@/plemiona-cookies';
import { ServersService } from '@/servers';
import {
    cacheVillageBuildingStatesOperation,
    getCachedVillageBuildingStatesOperation,
    cleanupExpiredCacheOperation,
    validateVillageExistsOperation,
    validateBuildingConfigOperation,
    validateNoDuplicateInQueueOperation,
    canSkipPlaywrightValidationOperation,
    validateBuildingRequirementsOperation,
    validateLevelContinuityOperation,
    getDatabaseQueueOperation,
    findQueueItemByLevelOperation,
    createQueueItemOperation,
    getQueueForVillageOperation,
    getAllQueuesOperation,
    removeFromQueueOperation,
    addToQueueOperation,
    addToQueueFromCacheOperation,
    getBuildingStatesOperation,
    getOldestBuildingPerVillageOperation,
    processSingleBuildingOperation,
    processAndCheckConstructionQueueOperation,
    scrapeVillageBuildingDataOperation,
    scrapeVillageQueueOperation,
    scrapeAllVillagesQueueOperation,
    createBrowserSessionOperation,
    CachedBuildingStates,
    GetCachedVillageBuildingStatesDependencies,
    CacheVillageBuildingStatesDependencies,
    CleanupExpiredCacheDependencies,
    ValidateVillageExistsDependencies,
    ValidateBuildingConfigDependencies,
    ValidateNoDuplicateInQueueDependencies,
    CanSkipPlaywrightValidationDependencies,
    ValidateBuildingRequirementsDependencies,
    ValidateLevelContinuityDependencies,
    GetDatabaseQueueDependencies,
    FindQueueItemByLevelDependencies,
    CreateQueueItemDependencies,
    GetQueueForVillageDependencies,
    GetAllQueuesDependencies,
    RemoveFromQueueDependencies,
    AddToQueueDependencies,
    AddToQueueFromCacheDependencies,
    GetBuildingStatesDependencies,
    GetOldestBuildingPerVillageDependencies,
    ProcessSingleBuildingDependencies,
    ProcessAndCheckConstructionQueueDependencies,
    ScrapeVillageBuildingDataDependencies,
    ScrapeVillageQueueDependencies,
    ScrapeAllVillagesQueueDependencies,
    CreateBrowserSessionDependencies
} from './operations';

@Injectable()
export class VillageConstructionQueueService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(VillageConstructionQueueService.name);
    private readonly credentials: PlemionaCredentials;
    private readonly MIN_INTERVAL = 1000 * 60 * 3; // 3 minuty
    private readonly MAX_INTERVAL = 1000 * 60 * 7; // 7 minut
    private queueProcessorIntervalId: NodeJS.Timeout | null = null;
    private readonly CACHE_TTL = 1000 * 60 * 5; // 5 minut
    private readonly buildingStatesCache = new Map<string, CachedBuildingStates>();
    private cacheCleanupInterval: NodeJS.Timeout | null = null;

    // Configuration for browser operations and timeouts
    private readonly CONFIG = {
        CLICK_TIMEOUT: 5000,
        VERIFY_DELAY: 3000, // Wait 3 seconds after clicking before verification
        MAX_RETRIES: 3,
        BROWSER_TIMEOUT: 30000,
        NAVIGATION_TIMEOUT: 5000,
        EXTRACTION_TIMEOUT: 5000
    };

    constructor(
        @Inject(VILLAGE_CONSTRUCTION_QUEUE_ENTITY_REPOSITORY)
        private readonly queueRepository: Repository<VillageConstructionQueueEntity>,
        @Inject(forwardRef(() => VillagesService))
        private readonly villagesService: VillagesService,
        @Inject(VILLAGES_ENTITY_REPOSITORY)
        private readonly villageRepository: Repository<VillageEntity>,
        private plemionaCookiesService: PlemionaCookiesService,
        private configService: ConfigService,
        @Inject(forwardRef(() => ServersService))
        private serversService: ServersService
    ) {
        this.credentials = {
            username: this.configService.get<string>('PLEMIONA_USERNAME') || '',
        };
    }

    async onModuleInit() {
        this.logger.log('VillageConstructionQueueService initialized (auto-start disabled - managed by orchestrator)');
        this.startCacheCleanup();
    }

    async onModuleDestroy() {
        if (this.cacheCleanupInterval) {
            clearInterval(this.cacheCleanupInterval);
        }
        this.stopConstructionQueueProcessor();
    }

    /**
     * Uruchamia okresowe czyszczenie cache
     */
    private startCacheCleanup(): void {
        this.cacheCleanupInterval = setInterval(() => {
            cleanupExpiredCacheOperation({
                buildingStatesCache: this.buildingStatesCache,
                cacheTtl: this.CACHE_TTL,
                logger: this.logger
            });
        }, 60000); // Sprawdzaj co minutę
    }

    /**
     * Zatrzymuje procesor kolejki budowy
     */
    private stopConstructionQueueProcessor(): void {
        if (this.queueProcessorIntervalId) {
            clearTimeout(this.queueProcessorIntervalId);
            this.queueProcessorIntervalId = null;
            this.logger.log('Construction queue processor stopped');
        }
    }

    /**
     * Generuje losowy interwał między MIN_INTERVAL a MAX_INTERVAL
     */
    private getRandomInterval(): number {
        return Math.floor(Math.random() * (this.MAX_INTERVAL - this.MIN_INTERVAL + 1)) + this.MIN_INTERVAL;
    }

    /**
     * Uruchamia procesor kolejki budowy który w losowych odstępach sprawdza bazę danych
     * i próbuje zrealizować najstarsze budynki z kolejki
     */
    private startConstructionQueueProcessor(serverId: number): void {
        this.logger.log(`Starting construction queue processor with random interval: ${this.MIN_INTERVAL / 1000 / 60}-${this.MAX_INTERVAL / 1000 / 60} minutes`);

        // Uruchom od razu przy starcie (nie czekaj pierwszego interwału)
        this.logger.log('🚀 Running initial queue processing...');
        this.processAndCheckConstructionQueue(serverId).catch(error => {
            this.logger.error('Error during initial queue processing:', error);
        });

        // Następnie ustaw losowy interwał
        this.scheduleNextExecution(serverId);
    }

    /**
     * Planuje następne wykonanie procesora w losowym czasie
     */
    private scheduleNextExecution(serverId: number): void {
        const nextInterval = this.getRandomInterval();
        const nextMinutes = Math.round(nextInterval / 1000 / 60 * 10) / 10;
        this.logger.log(`⏰ Next execution scheduled in ${nextMinutes} minutes`);

        this.queueProcessorIntervalId = setTimeout(async () => {
            try {
                await this.processAndCheckConstructionQueue(serverId);
            } catch (error) {
                this.logger.error('Error during construction queue processing:', error);
            }
            this.scheduleNextExecution(serverId); // Rekursywnie zaplanuj następne
        }, nextInterval);
    }

    /**
     * Zapisuje stany budynków do cache
     */
    public cacheVillageBuildingStates(
        serverId: number,
        villageId: string,
        buildingLevels: any,
        buildQueue: any[]
    ): void {
        cacheVillageBuildingStatesOperation(serverId, villageId, buildingLevels, buildQueue, {
            buildingStatesCache: this.buildingStatesCache,
            logger: this.logger
        });
    }

    /**
     * Pobiera stany budynków z cache
     */
    public getCachedVillageBuildingStates(
        serverId: number,
        villageId: string
    ): CachedBuildingStates | null {
        return getCachedVillageBuildingStatesOperation(serverId, villageId, {
            buildingStatesCache: this.buildingStatesCache,
            cacheTtl: this.CACHE_TTL,
            logger: this.logger
        });
    }

    /**
     * Pobiera stany budynków dla wioski z cache wraz z maxLevels i kolejką z bazy danych
     * Jeśli cache nie istnieje, wykonuje zapytanie do gry (Playwright)
     */
    public async getBuildingStates(serverId: number, villageName: string) {
        return getBuildingStatesOperation(serverId, villageName, {
            logger: this.logger,
            villagesService: this.villagesService,
            getQueueForVillageDeps: {
                queueRepository: this.queueRepository,
                logger: this.logger
            },
            getCachedVillageBuildingStatesDeps: {
                buildingStatesCache: this.buildingStatesCache,
                cacheTtl: this.CACHE_TTL,
                logger: this.logger
            },
            scrapeVillageQueueDeps: {
                logger: this.logger,
                villagesService: this.villagesService,
                serversService: this.serversService,
                createBrowserSessionDeps: {
                    serversService: this.serversService,
                    credentials: this.credentials,
                    plemionaCookiesService: this.plemionaCookiesService,
                    logger: this.logger
                },
                scrapeVillageBuildingDataDeps: {
                    logger: this.logger,
                    cacheVillageBuildingStatesDeps: {
                        buildingStatesCache: this.buildingStatesCache,
                        logger: this.logger
                    }
                }
            }
        });
    }

    /**
     * Przetwarza kolejkę budowy:
     * 1. Pobiera najstarsze wpisy z bazy danych (FIFO)
     * 2. Grupuje według wiosek
     * 3. Dla każdej wioski używa scrappera do sprawdzenia czy można budować
     * 4. Loguje informacje o możliwych budowach
     */
    public async processAndCheckConstructionQueue(serverId: number): Promise<void> {
        return processAndCheckConstructionQueueOperation(serverId, {
            logger: this.logger,
            serversService: this.serversService,
            getOldestBuildingPerVillageDeps: {
                queueRepository: this.queueRepository,
                logger: this.logger
            },
            createBrowserSessionDeps: {
                serversService: this.serversService,
                credentials: this.credentials,
                plemionaCookiesService: this.plemionaCookiesService,
                logger: this.logger
            },
            processSingleBuildingDeps: {
                logger: this.logger,
                navigateToVillageWithRetryDeps: {
                    logger: this.logger,
                    maxRetries: this.CONFIG.MAX_RETRIES
                },
                getCurrentBuildingLevelDeps: {
                    logger: this.logger
                },
                extractGameBuildQueueDeps: {
                    logger: this.logger
                },
                attemptToBuildWithRetryDeps: {
                    logger: this.logger,
                    maxRetries: this.CONFIG.MAX_RETRIES,
                    clickTimeout: this.CONFIG.CLICK_TIMEOUT,
                    verifyDelay: this.CONFIG.VERIFY_DELAY,
                    extractGameBuildQueueDeps: {
                        logger: this.logger
                    }
                },
                removeFromDatabaseWithReasonDeps: {
                    logger: this.logger,
                    removeFromQueueDeps: {
                        queueRepository: this.queueRepository,
                        logger: this.logger
                    }
                }
            },
            scrapeVillageBuildingDataDeps: {
                logger: this.logger,
                cacheVillageBuildingStatesDeps: {
                    buildingStatesCache: this.buildingStatesCache,
                    logger: this.logger
                }
            }
        });
    }

    /**
     * Dodaje budynek do kolejki budowy używając danych z cache (bez Playwright)
     */
    async addToQueueFromCache(
        serverId: number,
        villageName: string,
        buildingId: string,
        targetLevel?: number
    ) {
        return addToQueueFromCacheOperation(serverId, villageName, buildingId, targetLevel, {
            logger: this.logger,
            villagesService: this.villagesService,
            getCachedVillageBuildingStatesDeps: {
                buildingStatesCache: this.buildingStatesCache,
                cacheTtl: this.CACHE_TTL,
                logger: this.logger
            },
            validateBuildingConfigDeps: {
                logger: this.logger
            },
            getDatabaseQueueDeps: {
                queueRepository: this.queueRepository,
                logger: this.logger
            },
            calculateNextAllowedLevelFromCacheDeps: {
                logger: this.logger
            },
            validateNoDuplicateInQueueDeps: {
                queueRepository: this.queueRepository,
                logger: this.logger
            },
            createQueueItemDeps: {
                queueRepository: this.queueRepository,
                logger: this.logger
            },
            getQueueForVillageDeps: {
                queueRepository: this.queueRepository,
                logger: this.logger
            }
        });
    }

    /**
     * Dodaje budynek do kolejki budowy z pełną walidacją
     */
    async addToQueue(dto: CreateConstructionQueueDto): Promise<VillageConstructionQueueEntity> {
        return addToQueueOperation(dto, {
            logger: this.logger,
            validateVillageExistsDeps: {
                villageRepository: this.villageRepository,
                logger: this.logger
            },
            validateBuildingConfigDeps: {
                logger: this.logger
            },
            validateNoDuplicateInQueueDeps: {
                queueRepository: this.queueRepository,
                logger: this.logger
            },
            canSkipPlaywrightValidationDeps: {
                logger: this.logger,
                findQueueItemByLevelDeps: {
                    queueRepository: this.queueRepository
                }
            },
            validateBuildingRequirementsDeps: {
                serversService: this.serversService,
                logger: this.logger
            },
            validateLevelContinuityDeps: {
                serversService: this.serversService,
                logger: this.logger,
                scrapeVillageBuildingDataDeps: {
                    logger: this.logger,
                    cacheVillageBuildingStatesDeps: {
                        buildingStatesCache: this.buildingStatesCache,
                        logger: this.logger
                    }
                },
                getDatabaseQueueDeps: {
                    queueRepository: this.queueRepository,
                    logger: this.logger
                },
                calculateNextAllowedLevelDeps: {
                    logger: this.logger
                }
            },
            createBrowserSessionDeps: {
                serversService: this.serversService,
                credentials: this.credentials,
                plemionaCookiesService: this.plemionaCookiesService,
                logger: this.logger
            },
            createQueueItemDeps: {
                queueRepository: this.queueRepository,
                logger: this.logger
            },
            serversService: this.serversService
        });
    }

    /**
     * Pobiera całą kolejkę budowy dla określonej wioski
     */
    async getQueueForVillage(villageId: string): Promise<VillageConstructionQueueEntity[]> {
        return getQueueForVillageOperation(villageId, {
            queueRepository: this.queueRepository,
            logger: this.logger
        });
    }

    /**
     * Pobiera całą kolejkę budowy dla wszystkich wiosek
     */
    async getAllQueues(serverId?: number): Promise<VillageConstructionQueueEntity[]> {
        return getAllQueuesOperation(serverId, {
            queueRepository: this.queueRepository,
            logger: this.logger
        });
    }

    /**
     * Usuwa wpis z kolejki budowy
     */
    async removeFromQueue(id: number): Promise<VillageConstructionQueueEntity> {
        return removeFromQueueOperation(id, {
            queueRepository: this.queueRepository,
            logger: this.logger
        });
    }

    /**
     * Scrapuje kolejkę budowy dla konkretnej wioski na podstawie nazwy
     */
    public async scrapeVillageQueue(serverId: number, villageName: string) {
        return scrapeVillageQueueOperation(serverId, villageName, {
            logger: this.logger,
            villagesService: this.villagesService,
            serversService: this.serversService,
            createBrowserSessionDeps: {
                serversService: this.serversService,
                credentials: this.credentials,
                plemionaCookiesService: this.plemionaCookiesService,
                logger: this.logger
            },
            scrapeVillageBuildingDataDeps: {
                logger: this.logger,
                cacheVillageBuildingStatesDeps: {
                    buildingStatesCache: this.buildingStatesCache,
                    logger: this.logger
                }
            }
        });
    }

    /**
     * Scrapuje kolejkę budowy dla wszystkich wiosek
     */
    public async scrapeAllVillagesQueue(serverId: number) {
        return scrapeAllVillagesQueueOperation(serverId, {
            logger: this.logger,
            villageRepository: this.villageRepository,
            villagesService: this.villagesService,
            serversService: this.serversService,
            credentials: this.credentials,
            plemionaCookiesService: this.plemionaCookiesService,
            scrapeVillageBuildingDataDeps: {
                logger: this.logger,
                cacheVillageBuildingStatesDeps: {
                    buildingStatesCache: this.buildingStatesCache,
                    logger: this.logger
                }
            }
        });
    }
}

