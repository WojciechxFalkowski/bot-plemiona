import { Page } from 'playwright';
import { Logger } from '@nestjs/common';
import { VillageOverviewPage, VillageData } from '../pages/village-overview.page';
import { VillageDetailPage } from '../pages/village-detail.page';
import {
    VillageCollectionOptions,
    VillageCollectionResult,
    VillageCollectionError,
    VillageValidationResult,
    VillageValidationIssue,
    VillageFilterCriteria,
    VillageSortCriteria,
    VillageStatistics,
    VillageLoggingOptions,
    VillageExportOptions,
    VillageImportOptions,
    VillageCacheOptions
} from './village.interfaces';

export class VillageUtils {
    private static logger = new Logger(VillageUtils.name);
    private static cache = new Map<string, { data: VillageData[]; timestamp: number }>();

    /**
     * Zbiera tylko podstawowe informacje o wioskach (overview)
     * @param page - Obiekt Page z Playwright
     * @param options - Opcje zbierania danych
     */
    static async collectBasicVillageInformation(
        page: Page,
        options: { timeoutPerPage?: number } = {}
    ): Promise<VillageCollectionResult> {
        const startTime = Date.now();
        const { timeoutPerPage = 15000 } = options;

        this.logger.log('Starting basic village information collection (overview only)');

        const result: VillageCollectionResult = {
            success: false,
            villagesProcessed: 0,
            villagesWithErrors: 0,
            totalVillages: 0,
            data: [],
            errors: [],
            processingTime: 0
        };

        try {
            // Ustaw timeout dla strony
            page.setDefaultTimeout(timeoutPerPage);

            // Zbierz podstawowe dane wiosek
            const overviewData = await this.collectVillageOverviewData(page);
            result.totalVillages = overviewData.length;
            result.data = overviewData;
            result.villagesProcessed = overviewData.length;

            this.logger.log(`Collected basic data for ${overviewData.length} villages`);

            result.success = true;
            result.processingTime = Date.now() - startTime;
            return result;

        } catch (error) {
            this.logger.error('Error during basic village information collection:', error);
            result.processingTime = Date.now() - startTime;
            result.errors.push({
                villageId: 'unknown',
                villageName: 'unknown',
                error: error.message,
                stage: 'overview'
            });
            return result;
        }
    }

    /**
     * Zbiera szczegółowe informacje o wioskach (overview + szczegóły)
     * @param page - Obiekt Page z Playwright
     * @param options - Opcje zbierania danych
     */
    static async collectDetailedVillageInformation(
        page: Page,
        options: VillageCollectionOptions = {}
    ): Promise<VillageCollectionResult> {
        const startTime = Date.now();
        const {
            skipBrokenVillages = true,
            delayBetweenVillages = 1000,
            timeoutPerVillage = 30000
        } = options;

        this.logger.log('Starting detailed village information collection (overview + details)');

        try {
            // Najpierw zbierz podstawowe dane
            const basicResult = await this.collectBasicVillageInformation(page, {
                timeoutPerPage: timeoutPerVillage
            });

            if (!basicResult.success || basicResult.data.length === 0) {
                this.logger.warn('Failed to collect basic village data or no villages found');
                return basicResult;
            }

            // Teraz zbierz szczegółowe dane dla każdej wioski
            const detailedResult = await this.collectDetailedVillageData(
                page,
                basicResult.data,
                {
                    skipBrokenVillages,
                    delayBetweenVillages,
                    timeoutPerVillage
                }
            );

            // Połącz wyniki
            const finalResult: VillageCollectionResult = {
                success: detailedResult.success,
                villagesProcessed: detailedResult.villagesProcessed,
                villagesWithErrors: detailedResult.errors.length,
                totalVillages: basicResult.totalVillages,
                data: detailedResult.data,
                errors: [...basicResult.errors, ...detailedResult.errors],
                processingTime: Date.now() - startTime
            };

            this.logger.log(`Detailed village information collection completed. Processed: ${finalResult.villagesProcessed}, Errors: ${finalResult.villagesWithErrors}, Time: ${finalResult.processingTime}ms`);

            return finalResult;

        } catch (error) {
            this.logger.error('Error during detailed village information collection:', error);
            return {
                success: false,
                villagesProcessed: 0,
                villagesWithErrors: 1,
                totalVillages: 0,
                data: [],
                errors: [{
                    villageId: 'unknown',
                    villageName: 'unknown',
                    error: error.message,
                    stage: 'detailed'
                }],
                processingTime: Date.now() - startTime
            };
        }
    }

    /**
     * Kompleksowa metoda zbierania informacji o wioskach (dla kompatybilności wstecznej)
     * @param page - Obiekt Page z Playwright
     * @param options - Opcje zbierania danych
     */
    static async collectVillageInformation(
        page: Page,
        options: VillageCollectionOptions = {}
    ): Promise<VillageCollectionResult> {
        const {
            includeDetailedData = true,
            includeOverviewOnly = false
        } = options;

        // Decyduj którą metodę wywołać na podstawie opcji
        if (includeOverviewOnly || !includeDetailedData) {
            return this.collectBasicVillageInformation(page, {
                timeoutPerPage: options.timeoutPerVillage
            });
        } else {
            return this.collectDetailedVillageInformation(page, options);
        }
    }

    /**
     * Zbiera dane przeglądu wiosek używając Page Object Model
     * @param page - Obiekt Page z Playwright
     */
    static async collectVillageOverviewData(page: Page): Promise<VillageData[]> {
        this.logger.log('=== Starting village overview data collection ===');

        try {
            // Stwórz instancję Village Overview Page Object
            const villageOverviewPage = new VillageOverviewPage(page);

            // Nawiguj do strony przeglądu wiosek
            await villageOverviewPage.navigate();
            this.logger.log('Successfully navigated to village overview page');

            // Poczekaj na załadowanie tabeli
            await villageOverviewPage.waitForTableLoad();

            // Pobierz liczbę wiosek
            const villageCount = await villageOverviewPage.getVillageCount();
            this.logger.log(`Found ${villageCount} villages to process`);

            // Wyciągnij wszystkie dane wiosek
            const villageData = await villageOverviewPage.extractVillageData();

            return villageData;

        } catch (error) {
            this.logger.error('Error collecting village overview data:', error);
            throw error;
        }
    }

    /**
     * Zbiera szczegółowe informacje dla każdej wioski
     * @param page - Obiekt Page z Playwright
     * @param villageData - Tablica podstawowych danych wiosek do wzbogacenia
     * @param options - Opcje zbierania szczegółowych danych
     */
    static async collectDetailedVillageData(
        page: Page,
        villageData: VillageData[],
        options: {
            skipBrokenVillages?: boolean;
            delayBetweenVillages?: number;
            timeoutPerVillage?: number;
        } = {}
    ): Promise<VillageCollectionResult> {
        const {
            skipBrokenVillages = true,
            delayBetweenVillages = 1000,
            timeoutPerVillage = 30000
        } = options;

        this.logger.log(`Starting detailed data collection for ${villageData.length} villages...`);

        const result: VillageCollectionResult = {
            success: false,
            villagesProcessed: 0,
            villagesWithErrors: 0,
            totalVillages: villageData.length,
            data: [...villageData], // Kopia danych
            errors: [],
            processingTime: 0
        };

        const startTime = Date.now();

        // Stwórz instancję Village Detail Page Object
        const villageDetailPage = new VillageDetailPage(page);

        // Przetwarzaj każdą wioskę osobno
        for (let i = 0; i < villageData.length; i++) {
            const village = villageData[i];
            this.logger.log(`Processing detailed data for village ${i + 1}/${villageData.length}: ${village.name} (${village.id})`);

            try {
                // Ustaw timeout dla tej wioski
                page.setDefaultTimeout(timeoutPerVillage);

                // Nawiguj do konkretnej wioski
                await villageDetailPage.navigateToVillage(village.id);
                this.logger.log(`Successfully navigated to village ${village.name}`);

                // Zbierz poziomy budynków
                this.logger.log(`Collecting building levels for ${village.name}...`);
                village.buildingLevels = await villageDetailPage.extractBuildingLevels();

                // Zbierz jednostki armii
                this.logger.log(`Collecting army units for ${village.name}...`);
                village.armyUnits = await villageDetailPage.extractArmyUnits();

                // Zbierz kolejkę budowy
                this.logger.log(`Collecting build queue for ${village.name}...`);
                village.buildQueue = await villageDetailPage.extractBuildQueue();

                // Zbierz kolejkę badań
                this.logger.log(`Collecting research queue for ${village.name}...`);
                village.researchQueue = await villageDetailPage.extractResearchQueue();

                // Zaloguj szczegółowe informacje
                this.logDetailedVillageData(village, i + 1);

                result.villagesProcessed++;

                // Małe opóźnienie między wioskami aby nie przeciążać serwera
                if (i < villageData.length - 1) {
                    await page.waitForTimeout(delayBetweenVillages);
                }

            } catch (error) {
                const errorInfo: VillageCollectionError = {
                    villageId: village.id,
                    villageName: village.name,
                    error: error.message,
                    stage: 'detailed'
                };

                result.errors.push(errorInfo);
                result.villagesWithErrors++;

                this.logger.error(`Error collecting detailed data for village ${village.name} (${village.id}):`, error);

                if (!skipBrokenVillages) {
                    // Jeśli nie pomijamy błędnych wiosek, przerwij całą operację
                    result.processingTime = Date.now() - startTime;
                    return result;
                }
                // W przeciwnym razie kontynuuj z następną wioską
                continue;
            }
        }

        result.success = true;
        result.processingTime = Date.now() - startTime;

        this.logger.log('=== DETAILED VILLAGE DATA COLLECTION COMPLETED ===');
        this.logger.log(`Processed: ${result.villagesProcessed}/${result.totalVillages}, Errors: ${result.villagesWithErrors}, Time: ${result.processingTime}ms`);

        return result;
    }

    /**
     * Loguje szczegółowe dane wioski w sformatowany sposób
     * @param village - Dane wioski do zalogowania
     * @param index - Indeks wioski do wyświetlenia
     * @param options - Opcje logowania
     */
    static logDetailedVillageData(
        village: VillageData,
        index: number,
        options: VillageLoggingOptions = {}
    ): void {
        const {
            includeResources = true,
            includeBuildings = true,
            includeArmy = true,
            includeQueues = true,
            detailLevel = 'standard'
        } = options;

        this.logger.log(`=== DETAILED DATA FOR VILLAGE ${index}: ${village.name} ===`);

        // Loguj podstawowe informacje
        if (detailLevel === 'detailed') {
            this.logger.log(`ID: ${village.id}, Coordinates: ${village.coordinates}, Points: ${village.points.toLocaleString()}`);
        }

        // Loguj surowce
        if (includeResources && village.resources) {
            this.logger.log(`Resources: Wood=${village.resources.wood.toLocaleString()}, Clay=${village.resources.clay.toLocaleString()}, Iron=${village.resources.iron.toLocaleString()}`);
            this.logger.log(`Storage: ${village.storage.toLocaleString()}, Population: ${village.population.current}/${village.population.max}`);
        }

        // Loguj poziomy budynków
        if (includeBuildings && village.buildingLevels) {
            this.logger.log('Building Levels:');
            this.logger.log(`  Military: Barracks=${village.buildingLevels.barracks}, Stable=${village.buildingLevels.stable}, Workshop=${village.buildingLevels.workshop}`);
            this.logger.log(`  Resources: Timber=${village.buildingLevels.timber_camp}, Clay=${village.buildingLevels.clay_pit}, Iron=${village.buildingLevels.iron_mine}`);
            this.logger.log(`  Infrastructure: HQ=${village.buildingLevels.headquarters}, Farm=${village.buildingLevels.farm}, Warehouse=${village.buildingLevels.warehouse}, Wall=${village.buildingLevels.wall}`);
        }

        // Loguj jednostki armii
        if (includeArmy && village.armyUnits) {
            this.logger.log('Army Units:');
            this.logger.log(`  Barracks: Spear=${village.armyUnits.barracks.spear}, Sword=${village.armyUnits.barracks.sword}, Axe=${village.armyUnits.barracks.axe}, Archer=${village.armyUnits.barracks.archer}`);
            this.logger.log(`  Stable: Scout=${village.armyUnits.stable.scout}, LC=${village.armyUnits.stable.light_cavalry}, MA=${village.armyUnits.stable.mounted_archer}, HC=${village.armyUnits.stable.heavy_cavalry}`);
            this.logger.log(`  Workshop: Ram=${village.armyUnits.workshop.ram}, Catapult=${village.armyUnits.workshop.catapult}`);
            if (village.armyUnits.church) {
                this.logger.log(`  Church: Paladin=${village.armyUnits.church.paladin}`);
            }
        }

        // Loguj kolejki
        if (includeQueues) {
            // Kolejka budowy
            if (village.buildQueue && village.buildQueue.length > 0) {
                this.logger.log('Build Queue:');
                village.buildQueue.forEach((item, idx) => {
                    this.logger.log(`  ${idx + 1}. ${item.building} Level ${item.level} - ${item.timeRemaining} remaining`);
                });
            } else {
                this.logger.log('Build Queue: Empty');
            }

            // Kolejka badań
            if (village.researchQueue && village.researchQueue.length > 0) {
                this.logger.log('Research Queue:');
                village.researchQueue.forEach((item, idx) => {
                    this.logger.log(`  ${idx + 1}. ${item.technology} - ${item.timeRemaining} remaining`);
                });
            } else {
                this.logger.log('Research Queue: Empty');
            }
        }

        this.logger.log('---');
    }

    /**
     * Waliduje dane wioski pod kątem kompletności i poprawności
     * @param village - Dane wioski do walidacji
     */
    static validateVillageData(village: VillageData): VillageValidationResult {
        const issues: VillageValidationIssue[] = [];

        // Sprawdź podstawowe pola
        if (!village.id || village.id.trim() === '') {
            issues.push({ field: 'id', issue: 'Village ID is missing or empty', severity: 'error' });
        }
        if (!village.name || village.name.trim() === '') {
            issues.push({ field: 'name', issue: 'Village name is missing or empty', severity: 'error' });
        }
        if (!village.coordinates || village.coordinates.trim() === '') {
            issues.push({ field: 'coordinates', issue: 'Village coordinates are missing or empty', severity: 'error' });
        }

        // Sprawdź punkty
        if (village.points < 0) {
            issues.push({ field: 'points', issue: 'Points cannot be negative', severity: 'error' });
        }
        if (village.points === 0) {
            issues.push({ field: 'points', issue: 'Village has 0 points', severity: 'warning' });
        }

        // Sprawdź populację
        if (village.population.current < 0 || village.population.max < 0) {
            issues.push({ field: 'population', issue: 'Population values cannot be negative', severity: 'error' });
        }
        if (village.population.current > village.population.max) {
            issues.push({ field: 'population', issue: 'Current population exceeds maximum', severity: 'warning' });
        }
        if (village.population.current === village.population.max) {
            issues.push({ field: 'population', issue: 'Village has no free farm space', severity: 'info' });
        }

        // Sprawdź surowce
        if (village.resources.wood < 0 || village.resources.clay < 0 || village.resources.iron < 0) {
            issues.push({ field: 'resources', issue: 'Resource values cannot be negative', severity: 'error' });
        }
        if (village.storage <= 0) {
            issues.push({ field: 'storage', issue: 'Storage capacity must be positive', severity: 'error' });
        }

        const totalResources = village.resources.wood + village.resources.clay + village.resources.iron;
        if (totalResources > village.storage * 3) { // 3 rodzaje surowców
            issues.push({ field: 'resources', issue: 'Resources exceed storage capacity', severity: 'warning' });
        }

        // Sprawdź format współrzędnych
        const coordPattern = /^\d{3}\|\d{3}$/;
        if (village.coordinates && !coordPattern.test(village.coordinates)) {
            issues.push({ field: 'coordinates', issue: 'Invalid coordinate format (should be XXX|YYY)', severity: 'warning' });
        }

        const isValid = issues.filter(i => i.severity === 'error').length === 0;

        return {
            isValid,
            village,
            issues
        };
    }

    /**
     * Filtruje wioski według podanych kryteriów
     * @param villages - Lista wiosek do filtrowania
     * @param criteria - Kryteria filtrowania
     */
    static filterVillages(villages: VillageData[], criteria: VillageFilterCriteria): VillageData[] {
        return villages.filter(village => {
            // Filtr punktów
            if (criteria.minPoints !== undefined && village.points < criteria.minPoints) return false;
            if (criteria.maxPoints !== undefined && village.points > criteria.maxPoints) return false;

            // Filtr populacji
            if (criteria.minPopulation !== undefined && village.population.current < criteria.minPopulation) return false;
            if (criteria.maxPopulation !== undefined && village.population.current > criteria.maxPopulation) return false;

            // Filtr wolnej farmy
            if (criteria.hasFreeFarm !== undefined) {
                const hasFreeFarm = village.population.current < village.population.max;
                if (criteria.hasFreeFarm !== hasFreeFarm) return false;
            }

            // Filtr surowców
            if (criteria.hasResources !== undefined) {
                const hasResources = village.resources.wood > 0 || village.resources.clay > 0 || village.resources.iron > 0;
                if (criteria.hasResources !== hasResources) return false;
            }

            // Filtr wzorca nazwy
            if (criteria.namePattern) {
                const regex = new RegExp(criteria.namePattern, 'i');
                if (!regex.test(village.name)) return false;
            }

            // Filtr współrzędnych do uwzględnienia
            if (criteria.coordinates && criteria.coordinates.length > 0) {
                if (!criteria.coordinates.includes(village.coordinates)) return false;
            }

            // Filtr współrzędnych do wykluczenia
            if (criteria.excludeCoordinates && criteria.excludeCoordinates.length > 0) {
                if (criteria.excludeCoordinates.includes(village.coordinates)) return false;
            }

            return true;
        });
    }

    /**
     * Sortuje wioski według podanych kryteriów
     * @param villages - Lista wiosek do sortowania
     * @param criteria - Kryteria sortowania
     */
    static sortVillages(villages: VillageData[], criteria: VillageSortCriteria): VillageData[] {
        const sorted = [...villages];

        sorted.sort((a, b) => {
            let valueA: any;
            let valueB: any;

            switch (criteria.field) {
                case 'name':
                    valueA = a.name.toLowerCase();
                    valueB = b.name.toLowerCase();
                    break;
                case 'points':
                    valueA = a.points;
                    valueB = b.points;
                    break;
                case 'population':
                    valueA = a.population.current;
                    valueB = b.population.current;
                    break;
                case 'resources':
                    valueA = a.resources.wood + a.resources.clay + a.resources.iron;
                    valueB = b.resources.wood + b.resources.clay + b.resources.iron;
                    break;
                case 'coordinates':
                    valueA = a.coordinates;
                    valueB = b.coordinates;
                    break;
                default:
                    return 0;
            }

            if (valueA < valueB) return criteria.direction === 'asc' ? -1 : 1;
            if (valueA > valueB) return criteria.direction === 'asc' ? 1 : -1;
            return 0;
        });

        return sorted;
    }

    /**
     * Oblicza statystyki dla grupy wiosek
     * @param villages - Lista wiosek do analizy
     */
    static calculateVillageStatistics(villages: VillageData[]): VillageStatistics {
        if (villages.length === 0) {
            return {
                totalVillages: 0,
                totalPoints: 0,
                averagePoints: 0,
                totalPopulation: 0,
                averagePopulation: 0,
                totalResources: { wood: 0, clay: 0, iron: 0 },
                averageResources: { wood: 0, clay: 0, iron: 0 },
                villagesWithFreeFarm: 0,
                villagesWithFullStorage: 0
            };
        }

        const totalVillages = villages.length;
        const totalPoints = villages.reduce((sum, v) => sum + v.points, 0);
        const totalPopulation = villages.reduce((sum, v) => sum + v.population.current, 0);

        const totalResources = villages.reduce((total, v) => ({
            wood: total.wood + v.resources.wood,
            clay: total.clay + v.resources.clay,
            iron: total.iron + v.resources.iron
        }), { wood: 0, clay: 0, iron: 0 });

        const villagesWithFreeFarm = villages.filter(v => v.population.current < v.population.max).length;
        const villagesWithFullStorage = villages.filter(v => {
            const totalRes = v.resources.wood + v.resources.clay + v.resources.iron;
            return totalRes >= v.storage * 2.7; // 90% wypełnienia dla 3 surowców
        }).length;

        return {
            totalVillages,
            totalPoints,
            averagePoints: totalPoints / totalVillages,
            totalPopulation,
            averagePopulation: totalPopulation / totalVillages,
            totalResources,
            averageResources: {
                wood: totalResources.wood / totalVillages,
                clay: totalResources.clay / totalVillages,
                iron: totalResources.iron / totalVillages
            },
            villagesWithFreeFarm,
            villagesWithFullStorage
        };
    }

    /**
     * Znajduje najlepsze wioski do określonego celu
     * @param villages - Lista wiosek do analizy
     * @param purpose - Cel (np. 'scavenging', 'farming', 'defense')
     * @param limit - Maksymalna liczba wiosek do zwrócenia
     */
    static findBestVillagesFor(villages: VillageData[], purpose: string, limit: number = 5): VillageData[] {
        let sortedVillages: VillageData[];

        switch (purpose) {
            case 'scavenging':
                // Najlepsze do zbieractwa: dużo jednostek, wolna farma
                sortedVillages = villages
                    .filter(v => v.population.current < v.population.max) // Wolna farma
                    .sort((a, b) => b.points - a.points); // Sortuj według punktów
                break;

            case 'farming':
                // Najlepsze do farmowania: dużo surowców, duże magazyny
                sortedVillages = villages.sort((a, b) => {
                    const aResources = a.resources.wood + a.resources.clay + a.resources.iron;
                    const bResources = b.resources.wood + b.resources.clay + b.resources.iron;
                    return bResources - aResources;
                });
                break;

            case 'defense':
                // Najlepsze do obrony: wysokie punkty, mur
                sortedVillages = villages.sort((a, b) => {
                    const aDefense = b.points + (a.buildingLevels?.wall || 0) * 100;
                    const bDefense = b.points + (b.buildingLevels?.wall || 0) * 100;
                    return bDefense - aDefense;
                });
                break;

            default:
                // Domyślnie sortuj według punktów
                sortedVillages = villages.sort((a, b) => b.points - a.points);
        }

        return sortedVillages.slice(0, limit);
    }

    /**
     * Eksportuje dane wiosek do różnych formatów
     * @param villages - Dane wiosek do eksportu
     * @param options - Opcje eksportu
     */
    static exportVillageData(villages: VillageData[], options: VillageExportOptions): string {
        const { format, includeDetailedData = true } = options;

        // Przygotuj dane do eksportu
        const exportData = villages.map(village => {
            const baseData = {
                id: village.id,
                name: village.name,
                coordinates: village.coordinates,
                points: village.points,
                resources: village.resources,
                storage: village.storage,
                population: village.population
            };

            if (includeDetailedData) {
                return {
                    ...baseData,
                    buildingLevels: village.buildingLevels,
                    armyUnits: village.armyUnits,
                    buildQueue: village.buildQueue,
                    researchQueue: village.researchQueue
                };
            }

            return baseData;
        });

        switch (format) {
            case 'json':
                return JSON.stringify(exportData, null, 2);

            case 'csv':
                if (exportData.length === 0) return '';

                const headers = Object.keys(exportData[0]).join(',');
                const rows = exportData.map(row =>
                    Object.values(row).map(value =>
                        typeof value === 'object' ? JSON.stringify(value) : String(value)
                    ).join(',')
                );
                return [headers, ...rows].join('\n');

            case 'xml':
                let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<villages>\n';
                exportData.forEach(village => {
                    xml += '  <village>\n';
                    Object.entries(village).forEach(([key, value]) => {
                        xml += `    <${key}>${typeof value === 'object' ? JSON.stringify(value) : value}</${key}>\n`;
                    });
                    xml += '  </village>\n';
                });
                xml += '</villages>';
                return xml;

            default:
                throw new Error(`Unsupported export format: ${format}`);
        }
    }

    /**
     * Cache'uje dane wiosek w pamięci
     * @param key - Klucz cache
     * @param data - Dane do cache'owania
     * @param options - Opcje cache
     */
    static cacheVillageData(key: string, data: VillageData[], options: VillageCacheOptions = {}): void {
        const { ttl = 300000 } = options; // 5 minut domyślnie

        this.cache.set(key, {
            data: [...data], // Kopia danych
            timestamp: Date.now() + ttl
        });

        this.logger.debug(`Cached village data for key: ${key}, TTL: ${ttl}ms`);
    }

    /**
     * Pobiera dane wiosek z cache
     * @param key - Klucz cache
     */
    static getCachedVillageData(key: string): VillageData[] | null {
        const cached = this.cache.get(key);

        if (!cached) {
            return null;
        }

        if (Date.now() > cached.timestamp) {
            this.cache.delete(key);
            this.logger.debug(`Cache expired for key: ${key}`);
            return null;
        }

        this.logger.debug(`Cache hit for key: ${key}`);
        return [...cached.data]; // Zwróć kopię
    }

    /**
     * Czyści cache
     * @param key - Konkretny klucz do usunięcia (opcjonalny)
     */
    static clearCache(key?: string): void {
        if (key) {
            this.cache.delete(key);
            this.logger.debug(`Cleared cache for key: ${key}`);
        } else {
            this.cache.clear();
            this.logger.debug('Cleared entire village cache');
        }
    }
} 