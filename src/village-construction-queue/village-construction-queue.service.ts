import { Injectable, BadRequestException, ConflictException, NotFoundException, Logger, Inject, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Repository } from 'typeorm';
import { VillageConstructionQueueEntity } from './entities/village-construction-queue.entity';
import { VillageEntity } from '../villages/villages.entity';
import { CreateConstructionQueueDto } from './dto/create-construction-queue.dto';
import { VillageDetailPage, getBuildingConfig, areBuildingRequirementsMet, TRIBAL_WARS_BUILDINGS } from '../crawler/pages/village-detail.page';
import { Page } from 'playwright';
import { VILLAGE_CONSTRUCTION_QUEUE_ENTITY_REPOSITORY } from './village-construction-queue.service.contracts';
import { VILLAGES_ENTITY_REPOSITORY } from '../villages/villages.service.contracts';
import { PlemionaCredentials } from '@/crawler/utils/auth.interfaces';
import { AuthUtils } from '@/crawler/utils/auth.utils';
import { ConfigService } from '@nestjs/config';
import { createBrowserPage } from '@/utils/browser.utils';
import { SettingsService } from '@/settings/settings.service';

@Injectable()
export class VillageConstructionQueueService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(VillageConstructionQueueService.name);
    private readonly credentials: PlemionaCredentials;
    private readonly INTERVAL_TIME = 1000 * 60 * 10;
    private queueProcessorIntervalId: NodeJS.Timeout | null = null;

    constructor(
        @Inject(VILLAGE_CONSTRUCTION_QUEUE_ENTITY_REPOSITORY)
        private readonly queueRepository: Repository<VillageConstructionQueueEntity>,
        @Inject(VILLAGES_ENTITY_REPOSITORY)
        private readonly villageRepository: Repository<VillageEntity>,
        private settingsService: SettingsService,
        private configService: ConfigService
    ) {
        // Initialize credentials from environment variables with default values if not set
        this.credentials = AuthUtils.getCredentialsFromEnvironmentVariables(this.configService);
        // Validate credentials
        this.validateCredentials();
    }

    /**
 * Validates the credentials
 * @returns void
 */
    public async validateCredentials() {
        const validation = AuthUtils.validateCredentials(this.credentials);
        if (!validation.isValid) {
            this.logger.warn(`Invalid credentials: missing fields: ${validation.missingFields.join(', ')}, errors: ${validation.errors.join(', ')}. Fallback to cookies will be attempted.`);
        } else {
            this.logger.log('Plemiona credentials loaded from environment variables successfully.');
        }
    }

    async onModuleInit() {
        this.logger.log('VillageConstructionQueueService initialized');
        this.startConstructionQueueProcessor();
    }

    /**
     * Uruchamia procesor kolejki budowy który co INTERVAL_TIME sprawdza bazę danych
     * i próbuje zrealizować najstarsze budynki z kolejki
     */
    private startConstructionQueueProcessor(): void {
        this.logger.log(`Starting construction queue processor with interval: ${this.INTERVAL_TIME / 1000 / 60} minutes`);

        this.queueProcessorIntervalId = setInterval(async () => {
            try {
                await this.processAndCheckConstructionQueue();
            } catch (error) {
                this.logger.error('Error during construction queue processing:', error);
            }
        }, this.INTERVAL_TIME);
    }

    /**
     * Przetwarza kolejkę budowy:
     * 1. Pobiera najstarsze wpisy z bazy danych (FIFO)
     * 2. Grupuje według wiosek
     * 3. Dla każdej wioski używa scrappera do sprawdzenia czy można budować
     * 4. Loguje informacje o możliwych budowach
     */
    private async processAndCheckConstructionQueue(): Promise<void> {
        this.logger.log('🔄 Processing construction queue from database...');
    }

    /**
     * Dodaje budynek do kolejki budowy z pełną walidacją
     * @param dto Dane budynku do dodania
     * @returns Utworzony wpis w kolejce
     */
    async addToQueue(dto: CreateConstructionQueueDto): Promise<VillageConstructionQueueEntity> {
        this.logger.log(`Adding building to queue: ${dto.buildingId} level ${dto.targetLevel} for village ${dto.villageId}`);

        // === PODSTAWOWA WALIDACJA (bez scrappowania) ===

        // 1. Sprawdź czy wioska istnieje
        const village = await this.validateVillageExists(dto.villageId);

        // 2. Sprawdź czy budynek istnieje w konfiguracji i targetLevel nie przekracza maksimum
        const buildingConfig = await this.validateBuildingConfig(dto.buildingId, dto.targetLevel);

        // 3. Sprawdź czy nie ma już takiego samego wpisu w kolejce
        await this.validateNoDuplicateInQueue(dto.villageId, dto.buildingId, dto.targetLevel, buildingConfig.name);

        // === ZAAWANSOWANA WALIDACJA (z scrappowaniem) ===

        // 4. Stwórz sesję przeglądarki do scrappowania danych z gry
        const { browser, context, page } = await this.createBrowserSession();

        try {
            // 5. Sprawdź wymagania budynku używając danych z gry
            await this.validateBuildingRequirementsWithScraping(dto.villageId, dto.buildingId, page);

            // 6. Sprawdź ciągłość poziomów (gra + budowa + baza)
            await this.validateLevelContinuity(dto.villageId, dto.buildingId, dto.targetLevel, buildingConfig.name, page);

        } finally {
            // Zawsze zamykaj przeglądarkę
            await browser.close();
        }

        // === TWORZENIE WPISU ===

        // 7. Utwórz nowy wpis w kolejce
        return await this.createQueueItem(dto, buildingConfig, village);
    }

    // ==============================
    // METODY PODSTAWOWEJ WALIDACJI
    // ==============================

    /**
     * Sprawdza czy wioska istnieje w bazie danych
     * @param villageId ID wioski do sprawdzenia
     * @returns Encja wioski jeśli istnieje
     * @throws NotFoundException jeśli wioska nie istnieje
     */
    private async validateVillageExists(villageId: string): Promise<VillageEntity> {
        const village = await this.villageRepository.findOne({
            where: { id: villageId }
        });

        if (!village) {
            this.logger.error(`Village ${villageId} not found`);
            throw new NotFoundException(`Village with ID ${villageId} not found`);
        }

        return village;
    }

    /**
     * Waliduje konfigurację budynku i maksymalny poziom
     * @param buildingId ID budynku do sprawdzenia
     * @param targetLevel Docelowy poziom budynku
     * @returns Konfiguracja budynku jeśli jest poprawna
     * @throws BadRequestException jeśli budynek nie istnieje lub poziom jest za wysoki
     */
    private async validateBuildingConfig(buildingId: string, targetLevel: number) {
        const buildingConfig = getBuildingConfig(buildingId);
        if (!buildingConfig) {
            this.logger.error(`Building ${buildingId} not found in configuration`);
            throw new BadRequestException(`Building '${buildingId}' is not a valid building ID`);
        }

        if (targetLevel > buildingConfig.maxLevel) {
            this.logger.error(`Target level ${targetLevel} exceeds max level ${buildingConfig.maxLevel} for building ${buildingId}`);
            throw new BadRequestException(
                `Target level ${targetLevel} exceeds maximum level ${buildingConfig.maxLevel} for building '${buildingConfig.name}'`
            );
        }

        return buildingConfig;
    }

    /**
     * Sprawdza czy nie ma już duplikatu w kolejce budowy
     * @param villageId ID wioski
     * @param buildingId ID budynku
     * @param targetLevel Docelowy poziom
     * @param buildingName Nazwa budynku (do komunikatu błędu)
     * @throws ConflictException jeśli duplikat istnieje
     */
    private async validateNoDuplicateInQueue(
        villageId: string,
        buildingId: string,
        targetLevel: number,
        buildingName: string
    ): Promise<void> {
        const existingQueueItem = await this.queueRepository.findOne({
            where: {
                villageId: villageId,
                buildingId: buildingId,
                targetLevel: targetLevel
            }
        });

        if (existingQueueItem) {
            this.logger.error(`Duplicate queue item: ${buildingId} level ${targetLevel} already exists for village ${villageId}`);
            throw new ConflictException(
                `Building '${buildingName}' level ${targetLevel} is already in queue for village ${villageId}`
            );
        }
    }

    // ==============================
    // METODY SESJI PRZEGLĄDARKI
    // ==============================

    /**
     * Tworzy sesję przeglądarki z zalogowaniem do gry
     * @returns Obiekt z przeglądarką, kontekstem i stroną
     * @throws BadRequestException jeśli logowanie się nie powiodło
     */
    private async createBrowserSession() {
        const { browser, context, page } = await createBrowserPage({ headless: true });

        const loginResult = await AuthUtils.loginAndSelectWorld(
            page,
            this.credentials,
            this.settingsService
        );

        if (!loginResult.success || !loginResult.worldSelected) {
            await browser.close();
            this.logger.error(`Login failed: ${loginResult.error || 'Unknown error'}`);
            throw new BadRequestException(`Login failed: ${loginResult.error || 'Unknown error'}`);
        }

        return { browser, context, page };
    }

    // ==============================
    // METODY ZAAWANSOWANEJ WALIDACJI
    // ==============================

    /**
     * Sprawdza wymagania budynku używając danych z gry
     * @param villageId ID wioski
     * @param buildingId ID budynku
     * @param page Strona przeglądarki
     * @throws BadRequestException jeśli wymagania nie są spełnione
     */
    private async validateBuildingRequirementsWithScraping(
        villageId: string,
        buildingId: string,
        page: Page
    ): Promise<void> {
        try {
            const villageDetailPage = new VillageDetailPage(page);
            await villageDetailPage.navigateToVillage(villageId);

            // Sprawdź wymagania budynku używając aktualnych danych z gry
            const requirementsCheck = await villageDetailPage.checkBuildingRequirements(buildingId);

            if (!requirementsCheck.met) {
                const missingReqs = requirementsCheck.missingRequirements
                    .map(req => {
                        const reqConfig = getBuildingConfig(req.buildingId);
                        const reqName = reqConfig ? reqConfig.name : req.buildingId;
                        return `${reqName} level ${req.level}`;
                    })
                    .join(', ');

                this.logger.error(`Building requirements not met for ${buildingId} in village ${villageId}. Missing: ${missingReqs}`);
                throw new BadRequestException(
                    `Building requirements not met for ${buildingId}. Missing: ${missingReqs}`
                );
            }

            this.logger.log(`Building requirements validated successfully for ${buildingId} in village ${villageId}`);

        } catch (error) {
            if (error instanceof BadRequestException) {
                throw error;
            }
            this.logger.error(`Error validating building requirements for ${buildingId} in village ${villageId}:`, error);
            throw new BadRequestException(`Failed to validate building requirements: ${error.message}`);
        }
    }

    /**
     * Główna metoda walidacji ciągłości poziomów
     * Sprawdza czy możemy dodać budynek na określonym poziomie uwzględniając:
     * - Aktualny poziom w grze
     * - Budynki w kolejce budowy w grze  
     * - Budynki w naszej kolejce w bazie
     * @param villageId ID wioski
     * @param buildingId ID budynku
     * @param targetLevel Docelowy poziom
     * @param buildingName Nazwa budynku (do komunikatów)
     * @param page Strona przeglądarki
     * @throws BadRequestException jeśli nie można dodać budynku na tym poziomie
     */
    private async validateLevelContinuity(
        villageId: string,
        buildingId: string,
        targetLevel: number,
        buildingName: string,
        page: Page
    ): Promise<void> {
        try {
            // 1. Pobierz wszystkie potrzebne dane
            const gameData = await this.scrapeGameData(villageId, page);
            const databaseQueue = await this.getDatabaseQueue(villageId, buildingId);

            // 2. Oblicz następny dozwolony poziom
            const nextAllowedLevel = this.calculateNextAllowedLevel(buildingId, gameData, databaseQueue);

            // 3. Sprawdź czy targetLevel to dokładnie następny dozwolony poziom
            if (targetLevel !== nextAllowedLevel) {
                const message = this.buildLevelContinuityErrorMessage(
                    buildingName,
                    targetLevel,
                    nextAllowedLevel,
                    gameData,
                    databaseQueue
                );

                this.logger.error(`Level continuity validation failed: ${message}`);
                throw new BadRequestException(message);
            }

            this.logger.log(`Level continuity validated successfully: ${buildingName} level ${targetLevel} can be added`);

        } catch (error) {
            if (error instanceof BadRequestException) {
                throw error;
            }
            this.logger.error(`Error validating level continuity for ${buildingId} level ${targetLevel} in village ${villageId}:`, error);
            throw new BadRequestException(`Failed to validate level continuity: ${error.message}`);
        }
    }

    // ==============================
    // METODY POMOCNICZE DLA WALIDACJI CIĄGŁOŚCI
    // ==============================

    /**
     * Pobiera dane z gry dla określonej wioski
     * @param villageId ID wioski
     * @param page Strona przeglądarki
     * @returns Dane z gry (poziomy budynków i kolejka budowy)
     */
    private async scrapeGameData(villageId: string, page: Page) {
        const villageDetailPage = new VillageDetailPage(page);
        await villageDetailPage.navigateToVillage(villageId);

        // Pobierz poziomy budynków z gry
        const buildingLevels = await villageDetailPage.extractBuildingLevels();

        // Pobierz aktualną kolejkę budowy z gry
        const buildQueue = await villageDetailPage.extractBuildQueue();

        this.logger.log(`Scraped game data for village ${villageId}: ${Object.keys(buildingLevels).length} buildings, ${buildQueue.length} items in game queue`);

        return {
            buildingLevels,
            buildQueue
        };
    }

    /**
     * Pobiera wszystkie budynki określonego typu z naszej kolejki w bazie dla danej wioski
     * @param villageId ID wioski
     * @param buildingId ID budynku
     * @returns Lista budynków z bazy posortowana według targetLevel
     */
    private async getDatabaseQueue(villageId: string, buildingId: string): Promise<VillageConstructionQueueEntity[]> {
        const queueItems = await this.queueRepository.find({
            where: {
                villageId: villageId,
                buildingId: buildingId
            },
            order: {
                targetLevel: 'ASC'
            }
        });

        this.logger.log(`Found ${queueItems.length} items in database queue for ${buildingId} in village ${villageId}`);

        return queueItems;
    }

    /**
     * Oblicza następny dozwolony poziom budynku na podstawie danych z gry i bazy
     * @param buildingId ID budynku
     * @param gameData Dane z gry (poziomy + kolejka budowy)
     * @param databaseQueue Kolejka budowy z bazy danych
     * @returns Następny dozwolony poziom
     */
    private calculateNextAllowedLevel(
        buildingId: string,
        gameData: { buildingLevels: any, buildQueue: any[] },
        databaseQueue: VillageConstructionQueueEntity[]
    ): number {
        // 1. Pobierz aktualny poziom z gry (buildingId jest teraz bezpośrednio kluczem w BuildingLevels)
        const gameLevel = gameData.buildingLevels[buildingId] || 0;

        // 2. Znajdź najwyższy poziom tego budynku w kolejce budowy gry
        const gameQueueLevel = this.getHighestLevelFromGameQueue(buildingId, gameData.buildQueue);

        // 3. Znajdź najwyższy poziom tego budynku w naszej kolejce w bazie
        const databaseLevel = databaseQueue.length > 0
            ? Math.max(...databaseQueue.map(item => item.targetLevel))
            : 0;

        // 4. Oblicz następny dozwolony poziom
        const maxCurrentLevel = Math.max(gameLevel, gameQueueLevel, databaseLevel);
        const nextAllowedLevel = maxCurrentLevel + 1;

        this.logger.log(`Level calculation for ${buildingId}: game=${gameLevel}, gameQueue=${gameQueueLevel}, database=${databaseLevel} => next=${nextAllowedLevel}`);

        return nextAllowedLevel;
    }

    /**
     * Znajduje najwyższy poziom określonego budynku w kolejce budowy gry
     * @param buildingId ID budynku
     * @param gameQueue Kolejka budowy z gry
     * @returns Najwyższy poziom lub 0 jeśli nie znaleziono
     */
    private getHighestLevelFromGameQueue(buildingId: string, gameQueue: any[]): number {
        const buildingConfig = getBuildingConfig(buildingId);
        if (!buildingConfig) {
            return 0;
        }

        let highestLevel = 0;

        for (const queueItem of gameQueue) {
            // Porównujemy nazwy budynków (kolejka z gry zawiera nazwy, nie ID)
            if (queueItem.building === buildingConfig.name) {
                highestLevel = Math.max(highestLevel, queueItem.level || 0);
            }
        }

        return highestLevel;
    }

    /**
     * Buduje szczegółowy komunikat błędu dla walidacji ciągłości poziomów
     * @param buildingName Nazwa budynku
     * @param targetLevel Docelowy poziom
     * @param nextAllowedLevel Następny dozwolony poziom
     * @param gameData Dane z gry
     * @param databaseQueue Kolejka z bazy
     * @returns Sformatowany komunikat błędu
     */
    private buildLevelContinuityErrorMessage(
        buildingName: string,
        targetLevel: number,
        nextAllowedLevel: number,
        gameData: any,
        databaseQueue: VillageConstructionQueueEntity[]
    ): string {
        const gameLevel = this.getCurrentGameLevel(buildingName, gameData.buildingLevels);
        const gameQueueCount = gameData.buildQueue.filter((item: any) => item.building === buildingName).length;
        const databaseCount = databaseQueue.length;

        return [
            `Cannot add ${buildingName} level ${targetLevel}.`,
            `Next allowed level is ${nextAllowedLevel}.`,
            `Current status:`,
            `- Game level: ${gameLevel}`,
            `- Game queue: ${gameQueueCount} items`,
            `- Database queue: ${databaseCount} items`,
            `Please add level ${nextAllowedLevel} instead.`
        ].join(' ');
    }

    /**
     * Pomocnicza metoda do pobrania aktualnego poziomu z gry na podstawie nazwy budynku
     * @param buildingName Nazwa budynku
     * @param buildingLevels Poziomy budynków z gry
     * @returns Aktualny poziom lub 0
     */
    private getCurrentGameLevel(buildingName: string, buildingLevels: any): number {
        // Znajdź buildingId na podstawie nazwy
        for (const [_, config] of Object.entries(TRIBAL_WARS_BUILDINGS)) {
            if ((config as any).name === buildingName) {
                const buildingId = (config as any).id;
                // buildingId jest teraz bezpośrednio kluczem w BuildingLevels
                return buildingLevels[buildingId] || 0;
            }
        }
        return 0;
    }

    // ==============================
    // METODY TWORZENIA WPISU
    // ==============================

    /**
     * Tworzy i zapisuje nowy wpis w kolejce budowy
     * @param dto Dane budynku
     * @param buildingConfig Konfiguracja budynku
     * @param village Encja wioski
     * @returns Zapisany wpis w kolejce
     */
    private async createQueueItem(
        dto: CreateConstructionQueueDto,
        buildingConfig: any,
        village: VillageEntity
    ): Promise<VillageConstructionQueueEntity> {
        const queueItem = this.queueRepository.create({
            villageId: dto.villageId,
            buildingId: dto.buildingId,
            buildingName: buildingConfig.name,
            targetLevel: dto.targetLevel,
            village: village
        });

        const savedItem = await this.queueRepository.save(queueItem);
        this.logger.log(`Successfully added ${buildingConfig.name} level ${dto.targetLevel} to queue for village ${dto.villageId}`);

        return savedItem;
    }

    // ==============================
    // PUBLICZNE METODY ODCZYTU
    // ==============================

    /**
     * Pobiera całą kolejkę budowy dla określonej wioski
     * @param villageId ID wioski
     * @returns Lista wszystkich budynków w kolejce dla tej wioski
     */
    async getQueueForVillage(villageId: string): Promise<VillageConstructionQueueEntity[]> {
        const queueItems = await this.queueRepository.find({
            where: { villageId },
            order: { createdAt: 'ASC' }, // FIFO - First In, First Out
            relations: ['village']
        });

        this.logger.log(`Retrieved ${queueItems.length} queue items for village ${villageId}`);
        return queueItems;
    }

    /**
     * Usuwa wpis z kolejki budowy
     * @param id ID wpisu do usunięcia (number)
     * @returns Usunięty wpis
     * @throws NotFoundException jeśli wpis nie istnieje
     */
    async removeFromQueue(id: number): Promise<VillageConstructionQueueEntity> {
        const queueItem = await this.queueRepository.findOne({
            where: { id },
            relations: ['village']
        });

        if (!queueItem) {
            this.logger.error(`Queue item ${id} not found`);
            throw new NotFoundException(`Queue item with ID ${id} not found`);
        }

        await this.queueRepository.remove(queueItem);
        this.logger.log(`Removed ${queueItem.buildingName} level ${queueItem.targetLevel} from queue for village ${queueItem.villageId}`);

        return queueItem;
    }

    // ==============================
    // METODY CLEANUP
    // ==============================

    /**
     * Zatrzymuje procesor kolejki budowy
     */
    private stopConstructionQueueProcessor(): void {
        if (this.queueProcessorIntervalId) {
            clearInterval(this.queueProcessorIntervalId);
            this.queueProcessorIntervalId = null;
            this.logger.log('Construction queue processor stopped');
        }
    }

    async onModuleDestroy() {
        this.stopConstructionQueueProcessor();
    }
} 