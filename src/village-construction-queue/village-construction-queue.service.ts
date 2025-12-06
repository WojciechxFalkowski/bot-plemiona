import { Injectable, BadRequestException, ConflictException, NotFoundException, Logger, Inject, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Repository } from 'typeorm';
import { VillageConstructionQueueEntity } from './entities/village-construction-queue.entity';
import { VillageEntity } from '../villages/entities/village.entity';
import { CreateConstructionQueueDto } from './dto/create-construction-queue.dto';
import { VillageDetailPage, getBuildingConfig, areBuildingRequirementsMet, TRIBAL_WARS_BUILDINGS, BuildingAvailability } from '../crawler/pages/village-detail.page';
import { Page } from 'playwright';
import { VILLAGE_CONSTRUCTION_QUEUE_ENTITY_REPOSITORY } from './village-construction-queue.service.contracts';
import { VILLAGES_ENTITY_REPOSITORY } from '../villages/villages.service.contracts';
import { ConfigService } from '@nestjs/config';
import { createBrowserPage } from '@/utils/browser.utils';
import { SettingsService } from '@/settings/settings.service';
import { BuildingLevels, BuildQueueItem } from '@/crawler/pages/village-overview.page';
import { VillageResponseDto } from '@/villages/dto';
import { VillagesService } from '@/villages/villages.service';
import { PlemionaCredentials } from '@/utils/auth/auth.interfaces';
import { AuthUtils } from '@/utils/auth/auth.utils';
import { PlemionaCookiesService } from '@/plemiona-cookies';
import { ServersService } from '@/servers';

@Injectable()
export class VillageConstructionQueueService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(VillageConstructionQueueService.name);
    private readonly credentials: PlemionaCredentials;
    private readonly MIN_INTERVAL = 1000 * 60 * 3; // 3 minuty
    private readonly MAX_INTERVAL = 1000 * 60 * 7; // 7 minut
    private queueProcessorIntervalId: NodeJS.Timeout | null = null;

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
        private readonly villagesService: VillagesService,
        @Inject(VILLAGES_ENTITY_REPOSITORY)
        private readonly villageRepository: Repository<VillageEntity>,
        private settingsService: SettingsService,
        private plemionaCookiesService: PlemionaCookiesService,
        private configService: ConfigService,
        private serversService: ServersService
    ) {
    }

    async onModuleInit() {
        this.logger.log('VillageConstructionQueueService initialized (auto-start disabled - managed by orchestrator)');
        // this.startConstructionQueueProcessor(); // DISABLED: Now managed by CrawlerOrchestratorService
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
     * Przetwarza kolejkę budowy:
     * 1. Pobiera najstarsze wpisy z bazy danych (FIFO)
     * 2. Grupuje według wiosek
     * 3. Dla każdej wioski używa scrappera do sprawdzenia czy można budować
     * 4. Loguje informacje o możliwych budowach
     */
    public async processAndCheckConstructionQueue(serverId: number): Promise<void> {
        this.logger.log('🔄 Processing construction queue from database...');

        try {
            const serverCode = await this.serversService.findById(serverId).then(server => server.serverCode);
            // 1. Pobierz najstarsze budynki per wioska (FIFO)
            const buildingsToProcess = await this.getOldestBuildingPerVillage();

            if (buildingsToProcess.length === 0) {
                this.logger.log('✅ No buildings in queue - waiting for next interval');
                return;
            }

            this.logger.log(`📋 Found ${buildingsToProcess.length} buildings to process across ${new Set(buildingsToProcess.map(b => b.villageId)).size} villages`);

            // 2. Zaloguj się do gry (jedna sesja dla całego batch'a)
            this.logger.log('🔐 Creating browser session and logging in...');
            const { browser, context, page } = await this.createBrowserSession(serverId);

            try {
                // 3. Przetworz każdy budynek sekwencyjnie
                let processedCount = 0;
                let successCount = 0;
                let errorCount = 0;

                for (const building of buildingsToProcess) {
                    processedCount++;
                    this.logger.log(`🏘️  Processing village ${building.village?.name || building.villageId} (${processedCount}/${buildingsToProcess.length}): ${building.buildingName} Level ${building.targetLevel}`);

                    try {
                        const result = await this.processSingleBuilding(serverCode, building, page);
                        if (result.success) {
                            successCount++;
                        }
                    } catch (error) {
                        errorCount++;
                        this.logger.error(`❌ Error processing building ${building.buildingName} L${building.targetLevel} in village ${building.villageId}:`, error);
                        // Continue with next building - don't stop the whole process
                    }
                }

                this.logger.log(`📊 Processing complete: ${successCount} successful, ${errorCount} errors, ${processedCount} total`);

            } finally {
                // 4. Zawsze zamykaj przeglądarkę
                await browser.close();
                this.logger.log('🔒 Browser session closed');
            }

        } catch (error) {
            this.logger.error('❌ Critical error during construction queue processing:', error);
            this.logger.log('⏰ Will retry at next scheduled interval');
        }

        this.logger.log('✅ Construction queue processing finished. Next execution scheduled.');
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

        // === OPTYMALIZACJA: Sprawdź czy można pominąć walidację Playwright ===
        const canSkipValidation = await this.canSkipPlaywrightValidation(
            dto.serverId,
            dto.villageId,
            dto.buildingId,
            dto.targetLevel
        );

        // === ZAAWANSOWANA WALIDACJA (z scrappowaniem) ===

        if (!canSkipValidation) {
            // 4. Stwórz sesję przeglądarki do scrappowania danych z gry
            const { browser, context, page } = await this.createBrowserSession(dto.serverId);

            try {
                // 5. Sprawdź wymagania budynku używając danych z gry
                await this.validateBuildingRequirementsWithScraping(dto.villageId, dto.buildingId, dto.serverId, page);

                // 6. Sprawdź ciągłość poziomów (gra + budowa + baza)
                const serverCode = await this.serversService.findById(dto.serverId).then(server => server.serverCode);

                await this.validateLevelContinuity(dto.serverId, serverCode, dto.villageId, dto.buildingId, dto.targetLevel, buildingConfig.name, page);

            } finally {
                // Zawsze zamykaj przeglądarkę
                await browser.close();
            }
        } else {
            this.logger.log(`Skipping Playwright validation - previous level found in queue for ${buildingConfig.name} level ${dto.targetLevel} in village ${dto.villageId}`);
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

    /**
     * Sprawdza, czy można pominąć walidację Playwright na podstawie istniejącego wpisu w kolejce
     * @param serverId ID serwera
     * @param villageId ID wioski
     * @param buildingId ID budynku
     * @param targetLevel Docelowy poziom
     * @returns true jeśli można pominąć walidację Playwright, false w przeciwnym razie
     */
    private async canSkipPlaywrightValidation(
        serverId: number,
        villageId: string,
        buildingId: string,
        targetLevel: number
    ): Promise<boolean> {
        const previousLevel = targetLevel - 1;

        if (previousLevel < 1) {
            return false;
        }

        const previousLevelItem = await this.findQueueItemByLevel(
            serverId,
            villageId,
            buildingId,
            previousLevel
        );

        if (previousLevelItem) {
            this.logger.log(
                `Found previous level ${previousLevel} in queue for ${buildingId} in village ${villageId} on server ${serverId}. ` +
                `Skipping Playwright validation for level ${targetLevel}.`
            );
            return true;
        }

        return false;
    }

    // ==============================
    // METODY SESJI PRZEGLĄDARKI
    // ==============================

    /**
     * Tworzy sesję przeglądarki z zalogowaniem do gry
     * @returns Obiekt z przeglądarką, kontekstem i stroną
     * @throws BadRequestException jeśli logowanie się nie powiodło
     */
    private async createBrowserSession(serverId: number) {
        const { browser, context, page } = await createBrowserPage({ headless: true });
        const serverName = await this.serversService.getServerName(serverId);
        const loginResult = await AuthUtils.loginAndSelectWorld(
            page,
            this.credentials,
            this.plemionaCookiesService,
            serverName
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
        serverId: number,
        page: Page
    ): Promise<void> {
        try {
            const villageDetailPage = new VillageDetailPage(page);
            const serverCode = await this.serversService.findById(serverId).then(server => server.serverCode);
            await villageDetailPage.navigateToVillage(serverCode, villageId);
            // Sprawdź wymagania budynku używając aktualnych danych z gry
            const requirementsCheck = await villageDetailPage.checkBuildingRequirements(serverCode, buildingId);

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
     * @param serverId ID serwera
     * @param serverCode Kod serwera
     * @param villageId ID wioski
     * @param buildingId ID budynku
     * @param targetLevel Docelowy poziom
     * @param buildingName Nazwa budynku (do komunikatów)
     * @param page Strona przeglądarki
     * @throws BadRequestException jeśli nie można dodać budynku na tym poziomie
     */
    private async validateLevelContinuity(
        serverId: number,
        serverCode: string,
        villageId: string,
        buildingId: string,
        targetLevel: number,
        buildingName: string,
        page: Page
    ): Promise<void> {
        try {
            // 1. Pobierz wszystkie potrzebne dane
            const gameData = await this.scrapeVillageBuildingData(serverCode, villageId, page);
            const databaseQueue = await this.getDatabaseQueue(serverId, villageId, buildingId);

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
    // METODY SCRAPOWANIA DANYCH Z GŁY
    // ==============================

    public async scrapeAllVillagesQueue(serverId: number): Promise<{
        villageInfo: VillageResponseDto;
        buildingLevels: BuildingLevels;
        buildQueue: BuildQueueItem[];
    }[]> {
        const { browser, context, page } = await this.createBrowserSession(serverId);
        const server = await this.serversService.findById(serverId);
        const serverCode = server.serverCode;
        const serverName = server.serverName;

        const loginResult = await AuthUtils.loginAndSelectWorld(
            page,
            this.credentials,
            this.plemionaCookiesService,
            serverName
        );
        if (!loginResult.success || !loginResult.worldSelected) {
            await browser.close();
            throw new BadRequestException(`Login failed: ${loginResult.error || 'Unknown error'}`);
        }

        const villages = await this.villageRepository.find();
        const data: {
            villageInfo: VillageResponseDto;
            buildingLevels: BuildingLevels;
            buildQueue: BuildQueueItem[];
        }[] = [];
        for (const village of villages) {
            const villageResponseDto = this.villagesService.mapToResponseDto(village);
            const { buildingLevels, buildQueue } = await this.scrapeVillageBuildingData(serverCode, village.id, page);
            data.push({ villageInfo: villageResponseDto, buildingLevels, buildQueue });
        }
        return data;
    }

    /**
     * Scrapuje kolejkę budowy dla konkretnej wioski na podstawie nazwy
     * @param villageName Nazwa wioski (np. "0001") 
     * @returns Dane o kolejce budowy dla danej wioski
     */
    public async scrapeVillageQueue(serverId: number, villageName: string): Promise<{
        villageInfo: VillageResponseDto;
        buildingLevels: BuildingLevels;
        buildQueue: BuildQueueItem[];
    }> {
        this.logger.log(`Scraping queue for village: ${villageName}`);

        // Znajdź wioskę po nazwie
        const village = await this.villagesService.findByName(serverId, villageName);
        if (!village) {
            throw new NotFoundException(`Village with name "${villageName}" not found`);
        }
        console.log("v1");
        console.log(serverId);

        const server = await this.serversService.findById(serverId);
        const serverCode = server.serverCode;

        const { browser, context, page } = await this.createBrowserSession(serverId);

        try {
            const villageResponseDto = this.villagesService.mapToResponseDto(village);
            const { buildingLevels, buildQueue } = await this.scrapeVillageBuildingData(serverCode, village.id, page);

            this.logger.log(`Successfully scraped queue for village "${villageName}" (ID: ${village.id})`);

            return {
                villageInfo: villageResponseDto,
                buildingLevels,
                buildQueue
            };

        } finally {
            await browser.close();
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
    private async scrapeVillageBuildingData(serverCode: string, villageId: string, page: Page) {
        const villageDetailPage = new VillageDetailPage(page);
        await villageDetailPage.navigateToVillage(serverCode, villageId);

        // Pobierz poziomy budynków z gry
        const buildingLevels = await villageDetailPage.extractBuildingLevels(serverCode);

        // Pobierz aktualną kolejkę budowy z gry
        // const buildQueue = await villageDetailPage.extractBuildQueue(serverCode);

        // this.logger.log(`Scraped game data for village ${villageId}: ${Object.keys(buildingLevels).length} buildings, ${buildQueue.length} items in game queue`);

        return {
            buildingLevels,
            buildQueue: []
        };
    }

    /**
     * Pobiera wszystkie budynki określonego typu z naszej kolejki w bazie dla danej wioski
     * @param serverId ID serwera
     * @param villageId ID wioski
     * @param buildingId ID budynku
     * @returns Lista budynków z bazy posortowana według targetLevel
     */
    private async getDatabaseQueue(serverId: number, villageId: string, buildingId: string): Promise<VillageConstructionQueueEntity[]> {
        const queueItems = await this.queueRepository.find({
            where: {
                serverId: serverId,
                villageId: villageId,
                buildingId: buildingId
            },
            order: {
                targetLevel: 'ASC'
            }
        });

        this.logger.log(`Found ${queueItems.length} items in database queue for ${buildingId} in village ${villageId} on server ${serverId}`);

        return queueItems;
    }

    /**
     * Znajduje wpis w kolejce dla konkretnego poziomu budynku
     * @param serverId ID serwera
     * @param villageId ID wioski
     * @param buildingId ID budynku
     * @param level Poziom do znalezienia
     * @returns Wpis w kolejce lub null jeśli nie znaleziono
     */
    private async findQueueItemByLevel(
        serverId: number,
        villageId: string,
        buildingId: string,
        level: number
    ): Promise<VillageConstructionQueueEntity | null> {
        const queueItem = await this.queueRepository.findOne({
            where: {
                serverId: serverId,
                villageId: villageId,
                buildingId: buildingId,
                targetLevel: level
            }
        });

        return queueItem;
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
            if (queueItem.building.toLowerCase() === buildingConfig.name.toLowerCase()) {
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
            village: village,
            serverId: dto.serverId
        });

        const savedItem = await this.queueRepository.save(queueItem);
        this.logger.log(`Successfully added for server ${dto.serverId} building: ${buildingConfig.name} level ${dto.targetLevel} to queue for village ${dto.villageId}`);

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
     * Pobiera całą kolejkę budowy dla wszystkich wiosek
     * @param serverId Opcjonalny ID serwera do filtrowania
     * @returns Lista wszystkich budynków w kolejce dla wszystkich wiosek lub filtrowana według serwera
     */
    async getAllQueues(serverId?: number): Promise<VillageConstructionQueueEntity[]> {
        const whereCondition = serverId ? { serverId } : {};

        const queueItems = await this.queueRepository.find({
            where: whereCondition,
            order: { createdAt: 'ASC' }, // FIFO - First In, First Out
            relations: ['village']
        });

        const logMessage = serverId
            ? `Retrieved ${queueItems.length} total queue items for server ${serverId}`
            : `Retrieved ${queueItems.length} total queue items for all villages`;

        this.logger.log(logMessage);
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
            clearTimeout(this.queueProcessorIntervalId);
            this.queueProcessorIntervalId = null;
            this.logger.log('Construction queue processor stopped');
        }
    }

    async onModuleDestroy() {
        this.stopConstructionQueueProcessor();
    }

    // ==============================
    // METODY PRZETWARZANIA KOLEJKI
    // ==============================

    /**
     * Pobiera najstarszy budynek dla każdej wioski z kolejki budowy
     * @returns Lista budynków do przetworzenia (jeden na wioskę)
     */
    private async getOldestBuildingPerVillage(): Promise<VillageConstructionQueueEntity[]> {
        try {
            // Pobierz wszystkie budynki posortowane według daty utworzenia (FIFO)
            const allQueueItems = await this.queueRepository.find({
                relations: ['village'],
                order: { createdAt: 'ASC' }
            });

            if (allQueueItems.length === 0) {
                return [];
            }

            // Grupuj według ID wioski i weź tylko pierwszy (najstarszy) dla każdej wioski
            const buildingsPerVillage = new Map<string, VillageConstructionQueueEntity>();

            for (const item of allQueueItems) {
                if (!buildingsPerVillage.has(item.villageId)) {
                    buildingsPerVillage.set(item.villageId, item);
                }
            }

            const result = Array.from(buildingsPerVillage.values());

            this.logger.log(`📦 Selected ${result.length} oldest buildings from ${allQueueItems.length} total queue items`);

            // Log details for each selected building
            result.forEach((building, index) => {
                this.logger.log(`  ${index + 1}. Village ${building.village?.name || building.villageId}: ${building.buildingName} L${building.targetLevel} (created: ${building.createdAt})`);
            });

            return result;

        } catch (error) {
            this.logger.error('Error fetching oldest buildings per village:', error);
            return [];
        }
    }

    /**
     * Przetwarza pojedynczy budynek w konkretnej wiosce
     * @param building Budynek do przetworzenia
     * @param page Strona przeglądarki
     * @returns Rezultat przetwarzania
     */
    private async processSingleBuilding(
        serverCode: string,
        building: VillageConstructionQueueEntity,
        page: Page
    ): Promise<{ success: boolean; reason: string; shouldDelete: boolean }> {

        const buildingInfo = `${building.buildingName} L${building.targetLevel} in village ${building.villageId}`;

        try {
            // 1. Nawiguj do wioski z retry mechanism
            this.logger.debug(`🧭 Navigating to village ${building.villageId}`);
            await this.navigateToVillageWithRetry(serverCode, building.villageId, page);

            // 2. Sprawdź aktualny poziom budynku vs target level
            this.logger.debug(`🔍 Checking current building level for ${building.buildingId}`);
            const currentLevel = await this.getCurrentBuildingLevel(serverCode, building.buildingId, page);

            if (building.targetLevel <= currentLevel) {
                this.logger.log(`✅ ${buildingInfo} - Already built (current: ${currentLevel})`);
                await this.removeFromDatabaseWithReason(building.id, 'Already built');
                return { success: true, reason: 'Already built', shouldDelete: true };
            }

            // 3. Sprawdź kolejkę budowy w grze (czy ma miejsce)
            this.logger.debug(`📋 Checking game build queue capacity`);
            const gameQueue = await this.extractGameBuildQueue(serverCode, page);

            if (gameQueue.length >= 2) {
                this.logger.log(`⏳ ${buildingInfo} - Game queue full (${gameQueue.length}/2 slots)`);
                return { success: false, reason: 'Game queue full', shouldDelete: false };
            }

            // SPRAWDŹ CZY TARGET LEVEL JUŻ JEST W KOLEJCE GRY
            const targetLevelInQueue = this.isTargetLevelInGameQueue(building.buildingId, building.targetLevel, gameQueue);

            if (targetLevelInQueue) {
                this.logger.log(`✅ ${buildingInfo} - Already in game queue`);
                await this.removeFromDatabaseWithReason(building.id, 'Already in game queue');
                return { success: true, reason: 'Already in game queue', shouldDelete: true };
            }

            // 4. Sprawdź czy można budować (przycisk vs czas)
            this.logger.debug(`🔍 Checking if building can be constructed`);
            const villageDetailPage = new VillageDetailPage(page);
            const buildingStatus = await villageDetailPage.checkBuildingBuildAvailability(serverCode, building.buildingId);

            if (buildingStatus.canBuild) {
                // 5. Kliknij przycisk budowania
                this.logger.log(`🔨 Attempting to build ${buildingInfo}`);
                const buildResult = await this.attemptToBuildWithRetry(serverCode, buildingStatus.buttonSelector!, page);

                if (buildResult.success) {
                    this.logger.log(`✅ Successfully added ${buildingInfo} to game queue`);
                    await this.removeFromDatabaseWithReason(building.id, 'Successfully added');
                    return { success: true, reason: 'Successfully added', shouldDelete: true };
                } else {
                    this.logger.warn(`⚠️  Failed to add ${buildingInfo} to queue: ${buildResult.reason}`);
                    return { success: false, reason: buildResult.reason, shouldDelete: false };
                }
            } else {
                // 6. Loguj informację o czasie dostępności
                if (buildingStatus.availableAt) {
                    this.logger.log(`⏰ ${buildingInfo} - Resources available at ${buildingStatus.availableAt}`);
                } else {
                    this.logger.log(`❌ ${buildingInfo} - Cannot build (reason: ${buildingStatus.reason})`);
                }
                return { success: false, reason: buildingStatus.reason || 'Cannot build', shouldDelete: false };
            }

        } catch (error) {
            this.logger.error(`❌ Error processing ${buildingInfo}:`, error);
            return { success: false, reason: `Error: ${error.message}`, shouldDelete: false };
        }
    }

    // ==============================
    // METODY POMOCNICZE - NAWIGACJA I RETRY
    // ==============================

    /**
     * Nawiguje do wioski z mechanizmem retry
     */
    private async navigateToVillageWithRetry(serverCode: string, villageId: string, page: Page): Promise<void> {
        for (let attempt = 1; attempt <= this.CONFIG.MAX_RETRIES; attempt++) {
            try {
                const villageDetailPage = new VillageDetailPage(page);
                await villageDetailPage.navigateToVillage(serverCode, villageId);
                return; // Success
            } catch (error) {
                this.logger.warn(`Navigation attempt ${attempt}/${this.CONFIG.MAX_RETRIES} failed for village ${villageId}:`, error);
                if (attempt === this.CONFIG.MAX_RETRIES) {
                    throw error;
                }
                await page.waitForTimeout(1000); // Wait 1 second before retry
            }
        }
    }

    /**
     * Pobiera aktualny poziom budynku z gry
     */
    private async getCurrentBuildingLevel(serverCode: string, buildingId: string, page: Page): Promise<number> {
        try {
            const villageDetailPage = new VillageDetailPage(page);
            return await villageDetailPage.getBuildingLevel(serverCode, buildingId);
        } catch (error) {
            this.logger.warn(`Error getting building level for ${buildingId}:`, error);
            return 0;
        }
    }

    /**
     * Pobiera kolejkę budowy z gry
     */
    private async extractGameBuildQueue(serverCode: string, page: Page): Promise<BuildQueueItem[]> {
        try {
            const villageDetailPage = new VillageDetailPage(page);
            return await villageDetailPage.extractBuildQueue(serverCode);
        } catch (error) {
            this.logger.warn('Error extracting game build queue:', error);
            return [];
        }
    }

    /**
     * Usuwa budynek z bazy danych z podaniem powodu
     */
    private async removeFromDatabaseWithReason(buildingId: number, reason: string): Promise<void> {
        try {
            await this.removeFromQueue(buildingId);
            this.logger.log(`🗑️  Removed from database: ${reason}`);
        } catch (error) {
            this.logger.error(`Error removing building ${buildingId} from database:`, error);
            throw error;
        }
    }

    // ==============================
    // METODY POMOCNICZE - SPRAWDZANIE I BUDOWANIE
    // ==============================

    /**
     * Próbuje zbudować budynek z mechanizmem retry
     */
    private async attemptToBuildWithRetry(serverCode: string, buttonSelector: string, page: Page): Promise<{
        success: boolean;
        reason: string;
    }> {
        // Get initial queue length for verification
        const initialQueue = await this.extractGameBuildQueue(serverCode, page);
        const initialQueueLength = initialQueue.length;

        this.logger.debug(`Initial game queue length: ${initialQueueLength}`);

        for (let attempt = 1; attempt <= this.CONFIG.MAX_RETRIES; attempt++) {
            try {
                this.logger.debug(`🔨 Build attempt ${attempt}/${this.CONFIG.MAX_RETRIES}: clicking button ${buttonSelector}`);

                // 1. Check if button exists and is clickable
                const buildButton = page.locator(buttonSelector);
                const buttonExists = await buildButton.count() > 0;

                if (!buttonExists) {
                    this.logger.warn(`Build button not found: ${buttonSelector}`);
                    return {
                        success: false,
                        reason: `Build button not found: ${buttonSelector}`
                    };
                }

                // Check if button is visible and enabled
                const isVisible = await buildButton.isVisible();
                const isEnabled = await buildButton.isEnabled();

                if (!isVisible) {
                    this.logger.warn(`Build button not visible: ${buttonSelector}`);
                    return {
                        success: false,
                        reason: `Build button not visible: ${buttonSelector}`
                    };
                }

                if (!isEnabled) {
                    this.logger.warn(`Build button not enabled: ${buttonSelector}`);
                    return {
                        success: false,
                        reason: `Build button not enabled: ${buttonSelector}`
                    };
                }

                // 2. Click the build button
                this.logger.debug(`Clicking build button: ${buttonSelector}`);
                await buildButton.click({ timeout: this.CONFIG.CLICK_TIMEOUT });

                // 3. Wait for the game to process the request
                this.logger.debug(`Waiting ${this.CONFIG.VERIFY_DELAY}ms for game to process building request...`);
                await page.waitForTimeout(this.CONFIG.VERIFY_DELAY);

                // 4. Verify by checking if queue length increased
                this.logger.debug('Verifying if building was added to queue...');
                const newQueue = await this.extractGameBuildQueue(serverCode, page);
                const newQueueLength = newQueue.length;

                this.logger.debug(`Queue length after click: ${newQueueLength} (was: ${initialQueueLength})`);

                if (newQueueLength > initialQueueLength) {
                    // Success - queue length increased
                    const addedBuilding = newQueue[newQueue.length - 1]; // Get last item (newest)
                    this.logger.log(`✅ Successfully added building to queue: ${addedBuilding.building} Level ${addedBuilding.level}`);
                    return {
                        success: true,
                        reason: `Building added to queue successfully`
                    };
                } else {
                    // Failed - queue length didn't change
                    this.logger.warn(`⚠️  Queue length didn't increase after clicking button (attempt ${attempt}/${this.CONFIG.MAX_RETRIES})`);

                    if (attempt === this.CONFIG.MAX_RETRIES) {
                        return {
                            success: false,
                            reason: `Queue length didn't increase after ${this.CONFIG.MAX_RETRIES} attempts`
                        };
                    }

                    // Wait before retry
                    await page.waitForTimeout(1000);
                    continue;
                }

            } catch (error) {
                this.logger.warn(`Build attempt ${attempt}/${this.CONFIG.MAX_RETRIES} failed:`, error);

                if (attempt === this.CONFIG.MAX_RETRIES) {
                    return {
                        success: false,
                        reason: `All ${this.CONFIG.MAX_RETRIES} attempts failed: ${error.message}`
                    };
                }

                // Wait before retry
                await page.waitForTimeout(1000);
            }
        }

        return {
            success: false,
            reason: 'Unexpected error in retry loop'
        };
    }

    /**
     * Sprawdza czy target level jest już w kolejce gry
     * @param buildingId ID budynku
     * @param targetLevel Docelowy poziom
     * @param gameQueue Kolejka budowy z gry
     * @returns True jeśli target level jest w kolejce gry, false w przeciwnym przypadku
     */
    private isTargetLevelInGameQueue(buildingId: string, targetLevel: number, gameQueue: BuildQueueItem[]): boolean {
        const buildingConfig = getBuildingConfig(buildingId);
        if (!buildingConfig) {
            return false;
        }

        for (const queueItem of gameQueue) {
            if (queueItem.building === buildingConfig.name && queueItem.level === targetLevel) {
                return true;
            }
        }
        return false;
    }
} 