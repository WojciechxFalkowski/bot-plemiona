import { Page, Locator } from 'playwright';
import { BuildingLevels, ArmyUnits, BuildQueueItem, ResearchQueueItem } from './village-overview.page';

// Interface for building availability check
export interface BuildingAvailability {
    canBuild: boolean;
    buttonSelector?: string;
    availableAt?: string;
    reason?: string;
}

// Enum dla ID budynków
export enum BuildingId {
    MAIN = 'main',
    WOOD = 'wood',
    STONE = 'stone',
    IRON = 'iron',
    FARM = 'farm',
    STORAGE = 'storage',
    HIDE = 'hide',
    PLACE = 'place',
    BARRACKS = 'barracks',
    STABLE = 'stable',
    GARAGE = 'garage',
    SMITH = 'smith',
    WALL = 'wall',
    MARKET = 'market',
    SNOB = 'snob',
    CHURCH = 'church',
    FIRST_CHURCH = 'first_church',
    WATCHTOWER = 'watchtower',
    STATUE = 'statue'
}

// Building requirements interface
interface BuildingRequirement {
    buildingId: BuildingId;
    level: number;
}

// Building configuration interface
interface BuildingConfig {
    id: BuildingId;
    name: string;
    screen: string;
    maxLevel: number;
    requirements: BuildingRequirement[];
    availableOnAllWorlds: boolean;
    description: string;
}

// Comprehensive building map for Tribal Wars
export const TRIBAL_WARS_BUILDINGS: Record<string, BuildingConfig> = {
    // Core buildings - always available
    MAIN: {
        id: BuildingId.MAIN,
        name: 'Ratusz',
        screen: 'main',
        maxLevel: 30,
        requirements: [],
        availableOnAllWorlds: true,
        description: 'Centralny budynek wioski, umożliwiający budowę i rozbudowę innych struktur'
    },

    // Resource buildings
    WOOD: {
        id: BuildingId.WOOD,
        name: 'Tartak',
        screen: 'wood',
        maxLevel: 30,
        requirements: [{ buildingId: BuildingId.MAIN, level: 1 }],
        availableOnAllWorlds: true,
        description: 'Produkuje drewno'
    },
    STONE: {
        id: BuildingId.STONE,
        name: 'Cegielnia',
        screen: 'stone',
        maxLevel: 30,
        requirements: [{ buildingId: BuildingId.MAIN, level: 1 }],
        availableOnAllWorlds: true,
        description: 'Produkuje glinę'
    },
    IRON: {
        id: BuildingId.IRON,
        name: 'Huta Żelaza',
        screen: 'iron',
        maxLevel: 30,
        requirements: [{ buildingId: BuildingId.MAIN, level: 1 }],
        availableOnAllWorlds: true,
        description: 'Produkuje żelazo'
    },

    // Infrastructure buildings
    FARM: {
        id: BuildingId.FARM,
        name: 'Zagroda',
        screen: 'farm',
        maxLevel: 30,
        requirements: [{ buildingId: BuildingId.MAIN, level: 1 }],
        availableOnAllWorlds: true,
        description: 'Zapewnia żywność dla mieszkańców i wojsk, zwiększając limit populacji'
    },
    STORAGE: {
        id: BuildingId.STORAGE,
        name: 'Spichlerz',
        screen: 'storage',
        maxLevel: 30,
        requirements: [{ buildingId: BuildingId.MAIN, level: 1 }],
        availableOnAllWorlds: true,
        description: 'Magazynuje surowce'
    },
    HIDE: {
        id: BuildingId.HIDE,
        name: 'Schowek',
        screen: 'hide',
        maxLevel: 10,
        requirements: [{ buildingId: BuildingId.MAIN, level: 1 }],
        availableOnAllWorlds: true,
        description: 'Pozwala ukryć część surowców przed grabieżą wrogów'
    },
    PLACE: {
        id: BuildingId.PLACE,
        name: 'Plac',
        screen: 'place',
        maxLevel: 1,
        requirements: [{ buildingId: BuildingId.MAIN, level: 1 }],
        availableOnAllWorlds: true,
        description: 'Miejsce zbiórki wojsk, skąd można wysyłać ataki i wsparcie'
    },

    // Military buildings
    BARRACKS: {
        id: BuildingId.BARRACKS,
        name: 'Koszary',
        screen: 'barracks',
        maxLevel: 25,
        requirements: [{ buildingId: BuildingId.MAIN, level: 3 }],
        availableOnAllWorlds: true,
        description: 'Umożliwiają rekrutację jednostek piechoty'
    },
    STABLE: {
        id: BuildingId.STABLE,
        name: 'Stajnia',
        screen: 'stable',
        maxLevel: 20,
        requirements: [
            { buildingId: BuildingId.MAIN, level: 10 },
            { buildingId: BuildingId.BARRACKS, level: 5 },
            { buildingId: BuildingId.SMITH, level: 5 }
        ],
        availableOnAllWorlds: true,
        description: 'Pozwala na rekrutację jednostek kawalerii'
    },
    GARAGE: {
        id: BuildingId.GARAGE,
        name: 'Warsztat',
        screen: 'garage',
        maxLevel: 15,
        requirements: [
            { buildingId: BuildingId.MAIN, level: 10 },
            { buildingId: BuildingId.SMITH, level: 10 }
        ],
        availableOnAllWorlds: true,
        description: 'Umożliwia produkcję machin oblężniczych'
    },
    SMITH: {
        id: BuildingId.SMITH,
        name: 'Kuźnia',
        screen: 'smith',
        maxLevel: 20,
        requirements: [{ buildingId: BuildingId.MAIN, level: 3 }], // Estimated requirement
        availableOnAllWorlds: true,
        description: 'Służy do badania nowych technologii i ulepszania jednostek'
    },
    WALL: {
        id: BuildingId.WALL,
        name: 'Mur Obronny',
        screen: 'wall',
        maxLevel: 20,
        requirements: [{ buildingId: BuildingId.BARRACKS, level: 1 }],
        availableOnAllWorlds: true,
        description: 'Zwiększa obronę wioski oraz siłę obronną stacjonujących wojsk'
    },

    // Economic buildings
    MARKET: {
        id: BuildingId.MARKET,
        name: 'Rynek',
        screen: 'market',
        maxLevel: 25,
        requirements: [
            { buildingId: BuildingId.MAIN, level: 3 }, // Estimated requirement
            { buildingId: BuildingId.STORAGE, level: 2 } // Estimated requirement
        ],
        availableOnAllWorlds: true,
        description: 'Umożliwia handel surowcami z innymi graczami oraz przesyłanie surowców'
    },

    // Advanced buildings
    SNOB: {
        id: BuildingId.SNOB,
        name: 'Pałac',
        screen: 'snob',
        maxLevel: 3, // Can be 1 or 3 depending on world settings
        requirements: [
            { buildingId: BuildingId.MAIN, level: 20 },
            { buildingId: BuildingId.SMITH, level: 20 },
            { buildingId: BuildingId.MARKET, level: 10 }
        ],
        availableOnAllWorlds: true,
        description: 'Umożliwia produkcję szlachciców, którzy są niezbędni do przejmowania wiosek'
    },

    // World-dependent buildings
    CHURCH: {
        id: BuildingId.CHURCH,
        name: 'Kościół',
        screen: 'church',
        maxLevel: 3, // Estimated max level
        requirements: [
            { buildingId: BuildingId.MAIN, level: 5 },
            { buildingId: BuildingId.FARM, level: 5 }
        ],
        availableOnAllWorlds: false,
        description: 'Wzmacnia morale wojsk w wioskach znajdujących się w jego strefie wpływów'
    },
    FIRST_CHURCH: {
        id: BuildingId.FIRST_CHURCH,
        name: 'Pierwszy Kościół',
        screen: 'church',
        maxLevel: 3, // Estimated max level
        requirements: [
            { buildingId: BuildingId.MAIN, level: 5 },
            { buildingId: BuildingId.FARM, level: 5 }
        ],
        availableOnAllWorlds: false,
        description: 'Unikalny kościół, możliwy do zbudowania tylko w jednej wiosce'
    },
    WATCHTOWER: {
        id: BuildingId.WATCHTOWER,
        name: 'Wieża Strażnicza',
        screen: 'watchtower',
        maxLevel: 20, // Estimated max level
        requirements: [{ buildingId: BuildingId.MAIN, level: 5 }], // Estimated requirement
        availableOnAllWorlds: false,
        description: 'Zwiększa zasięg widzenia wojsk'
    },
    STATUE: {
        id: BuildingId.STATUE,
        name: 'Piedestał',
        screen: 'statue',
        maxLevel: 1,
        requirements: [{ buildingId: BuildingId.MAIN, level: 1 }], // Estimated requirement
        availableOnAllWorlds: false,
        description: 'Miejsce mianowania nowego rycerza'
    }
} as const;

// Helper function to get building configuration
export function getBuildingConfig(buildingId: BuildingId | string): BuildingConfig | undefined {
    return Object.values(TRIBAL_WARS_BUILDINGS).find(building => building.id === buildingId);
}

// Helper function to get building by screen name
export function getBuildingByScreen(screen: string): BuildingConfig | undefined {
    return Object.values(TRIBAL_WARS_BUILDINGS).find(building => building.screen === screen);
}

// Helper function to check if building requirements are met
export function areBuildingRequirementsMet(
    buildingId: BuildingId | string,
    currentBuildingLevels: BuildingLevels
): { met: boolean; missingRequirements: BuildingRequirement[] } {
    const building = getBuildingConfig(buildingId);
    if (!building) {
        return { met: false, missingRequirements: [] };
    }

    const missingRequirements: BuildingRequirement[] = [];

    for (const requirement of building.requirements) {
        const currentLevel = currentBuildingLevels[requirement.buildingId as keyof BuildingLevels] || 0;

        if (currentLevel < requirement.level) {
            missingRequirements.push(requirement);
        }
    }

    return {
        met: missingRequirements.length === 0,
        missingRequirements
    };
}

// Tablica budynków - wersja tablicowa dla łatwiejszego iterowania i wyszukiwania
export const BUILDINGS_ARRAY: BuildingConfig[] = [
    {
        id: BuildingId.MAIN,
        name: 'Ratusz',
        screen: 'main',
        maxLevel: 30,
        requirements: [],
        availableOnAllWorlds: true,
        description: 'Centralny budynek wioski, umożliwiający budowę i rozbudowę innych struktur'
    },
    {
        id: BuildingId.WOOD,
        name: 'Tartak',
        screen: 'wood',
        maxLevel: 30,
        requirements: [{ buildingId: BuildingId.MAIN, level: 1 }],
        availableOnAllWorlds: true,
        description: 'Produkuje drewno'
    },
    {
        id: BuildingId.STONE,
        name: 'Cegielnia',
        screen: 'stone',
        maxLevel: 30,
        requirements: [{ buildingId: BuildingId.MAIN, level: 1 }],
        availableOnAllWorlds: true,
        description: 'Produkuje glinę'
    },
    {
        id: BuildingId.IRON,
        name: 'Huta Żelaza',
        screen: 'iron',
        maxLevel: 30,
        requirements: [{ buildingId: BuildingId.MAIN, level: 1 }],
        availableOnAllWorlds: true,
        description: 'Produkuje żelazo'
    },
    {
        id: BuildingId.FARM,
        name: 'Zagroda',
        screen: 'farm',
        maxLevel: 30,
        requirements: [{ buildingId: BuildingId.MAIN, level: 1 }],
        availableOnAllWorlds: true,
        description: 'Zapewnia żywność dla mieszkańców i wojsk, zwiększając limit populacji'
    },
    {
        id: BuildingId.STORAGE,
        name: 'Spichlerz',
        screen: 'storage',
        maxLevel: 30,
        requirements: [{ buildingId: BuildingId.MAIN, level: 1 }],
        availableOnAllWorlds: true,
        description: 'Magazynuje surowce'
    },
    {
        id: BuildingId.HIDE,
        name: 'Schowek',
        screen: 'hide',
        maxLevel: 10,
        requirements: [{ buildingId: BuildingId.MAIN, level: 1 }],
        availableOnAllWorlds: true,
        description: 'Pozwala ukryć część surowców przed grabieżą wrogów'
    },
    {
        id: BuildingId.PLACE,
        name: 'Plac',
        screen: 'place',
        maxLevel: 1,
        requirements: [{ buildingId: BuildingId.MAIN, level: 1 }],
        availableOnAllWorlds: true,
        description: 'Miejsce zbiórki wojsk, skąd można wysyłać ataki i wsparcie'
    },
    {
        id: BuildingId.BARRACKS,
        name: 'Koszary',
        screen: 'barracks',
        maxLevel: 25,
        requirements: [{ buildingId: BuildingId.MAIN, level: 3 }],
        availableOnAllWorlds: true,
        description: 'Umożliwiają rekrutację jednostek piechoty'
    },
    {
        id: BuildingId.STABLE,
        name: 'Stajnia',
        screen: 'stable',
        maxLevel: 20,
        requirements: [
            { buildingId: BuildingId.MAIN, level: 10 },
            { buildingId: BuildingId.BARRACKS, level: 5 },
            { buildingId: BuildingId.SMITH, level: 5 }
        ],
        availableOnAllWorlds: true,
        description: 'Pozwala na rekrutację jednostek kawalerii'
    },
    {
        id: BuildingId.GARAGE,
        name: 'Warsztat',
        screen: 'garage',
        maxLevel: 15,
        requirements: [
            { buildingId: BuildingId.MAIN, level: 10 },
            { buildingId: BuildingId.SMITH, level: 10 }
        ],
        availableOnAllWorlds: true,
        description: 'Umożliwia produkcję machin oblężniczych'
    },
    {
        id: BuildingId.SMITH,
        name: 'Kuźnia',
        screen: 'smith',
        maxLevel: 20,
        requirements: [{ buildingId: BuildingId.MAIN, level: 3 }],
        availableOnAllWorlds: true,
        description: 'Służy do badania nowych technologii i ulepszania jednostek'
    },
    {
        id: BuildingId.WALL,
        name: 'Mur Obronny',
        screen: 'wall',
        maxLevel: 20,
        requirements: [{ buildingId: BuildingId.BARRACKS, level: 1 }],
        availableOnAllWorlds: true,
        description: 'Zwiększa obronę wioski oraz siłę obronną stacjonujących wojsk'
    },
    {
        id: BuildingId.MARKET,
        name: 'Rynek',
        screen: 'market',
        maxLevel: 25,
        requirements: [
            { buildingId: BuildingId.MAIN, level: 3 },
            { buildingId: BuildingId.STORAGE, level: 2 }
        ],
        availableOnAllWorlds: true,
        description: 'Umożliwia handel surowcami z innymi graczami oraz przesyłanie surowców'
    },
    {
        id: BuildingId.SNOB,
        name: 'Pałac',
        screen: 'snob',
        maxLevel: 3,
        requirements: [
            { buildingId: BuildingId.MAIN, level: 20 },
            { buildingId: BuildingId.SMITH, level: 20 },
            { buildingId: BuildingId.MARKET, level: 10 }
        ],
        availableOnAllWorlds: true,
        description: 'Umożliwia produkcję szlachciców, którzy są niezbędni do przejmowania wiosek'
    },
    {
        id: BuildingId.CHURCH,
        name: 'Kościół',
        screen: 'church',
        maxLevel: 3,
        requirements: [
            { buildingId: BuildingId.MAIN, level: 5 },
            { buildingId: BuildingId.FARM, level: 5 }
        ],
        availableOnAllWorlds: false,
        description: 'Wzmacnia morale wojsk w wioskach znajdujących się w jego strefie wpływów'
    },
    {
        id: BuildingId.FIRST_CHURCH,
        name: 'Pierwszy Kościół',
        screen: 'church',
        maxLevel: 3,
        requirements: [
            { buildingId: BuildingId.MAIN, level: 5 },
            { buildingId: BuildingId.FARM, level: 5 }
        ],
        availableOnAllWorlds: false,
        description: 'Unikalny kościół, możliwy do zbudowania tylko w jednej wiosce'
    },
    {
        id: BuildingId.WATCHTOWER,
        name: 'Wieża Strażnicza',
        screen: 'watchtower',
        maxLevel: 20,
        requirements: [{ buildingId: BuildingId.MAIN, level: 5 }],
        availableOnAllWorlds: false,
        description: 'Zwiększa zasięg widzenia wojsk'
    },
    {
        id: BuildingId.STATUE,
        name: 'Piedestał',
        screen: 'statue',
        maxLevel: 1,
        requirements: [{ buildingId: BuildingId.MAIN, level: 1 }],
        availableOnAllWorlds: false,
        description: 'Miejsce mianowania nowego rycerza'
    }
];

// Helper function to convert TRIBAL_WARS_BUILDINGS object to array format
export function convertBuildingsToArray(): BuildingConfig[] {
    return Object.values(TRIBAL_WARS_BUILDINGS);
}

// Helper function to get buildings available on all worlds (filters out world-dependent buildings)
export function getAvailableBuildingsOnAllWorlds(): BuildingConfig[] {
    return BUILDINGS_ARRAY.filter(building => building.availableOnAllWorlds);
}

// Helper function to get buildings by availability
export function getBuildingsByAvailability(availableOnAllWorlds: boolean): BuildingConfig[] {
    return BUILDINGS_ARRAY.filter(building => building.availableOnAllWorlds === availableOnAllWorlds);
}

// Page Object Model for individual village detail pages
export class VillageDetailPage {
    private readonly page: Page;

    constructor(page: Page) {
        this.page = page;
    }

    /**
     * Navigates to a specific village by ID
     * @param villageId - The village ID to navigate to
     */
    async navigateToVillage(villageId: string): Promise<void> {
        const villageUrl = `https://pl214.plemiona.pl/game.php?village=${villageId}&screen=main`;
        await this.page.goto(villageUrl, { waitUntil: 'networkidle' });
        await this.page.waitForTimeout(2000); // Wait for page to fully load
    }

    /**
     * Extracts building levels from the village main screen
     * @returns BuildingLevels object with all building levels
     */
    async extractBuildingLevels(): Promise<BuildingLevels> {
        try {
            // Wait for buildings table to be visible
            await this.page.waitForSelector('#buildings', { timeout: 10000 });

            // Initialize building levels with default values
            const buildingLevels: BuildingLevels = this.getDefaultBuildingLevels();

            // Process available buildings
            const buildingRows = this.page.locator('#buildings tbody tr[id^="main_buildrow_"]');
            const rowCount = await buildingRows.count();

            for (let i = 0; i < rowCount; i++) {
                const row = buildingRows.nth(i);
                const rowId = await row.getAttribute('id') || '';
                const buildingId = rowId.replace('main_buildrow_', '') as BuildingId;

                // Skip if no valid ID or not in our enum
                if (!buildingId || !Object.values(BuildingId).includes(buildingId)) {
                    continue;
                }

                // Extract building level from the name cell
                const nameCell = row.locator('td:first-child');
                const nameText = await nameCell.textContent() || '';

                // Look for "Poziom X" pattern in the text
                const levelMatch = nameText.match(/Poziom (\d+)/);
                const level = levelMatch ? parseInt(levelMatch[1], 10) : 0;

                // Use buildingId directly as key since BuildingLevels now uses same keys as BuildingId enum
                if (buildingId in buildingLevels) {
                    (buildingLevels as any)[buildingId] = level;
                }
            }

            return buildingLevels;

        } catch (error) {
            console.error('Error extracting building levels:', error);
            // Return default levels on error
            return this.getDefaultBuildingLevels();
        }
    }

    /**
     * Returns default building levels (all set to 0) using enum values
     * @returns BuildingLevels with all levels set to 0
     */
    private getDefaultBuildingLevels(): BuildingLevels {
        return {
            main: 0,
            barracks: 0,
            stable: 0,
            garage: 0,    // Changed from workshop
            church: 0,
            snob: 0,      // Changed from academy
            smith: 0,
            place: 0,     // Changed from rally_point
            statue: 0,
            market: 0,
            wood: 0,      // Changed from timber_camp
            stone: 0,     // Changed from clay_pit
            iron: 0,      // Changed from iron_mine
            farm: 0,
            storage: 0,   // Changed from warehouse
            hide: 0,      // Changed from hiding_place
            wall: 0
        };
    }

    /**
     * Checks if a building can be built/upgraded by examining the build options cell
     * @param buildingRow - The building row element from the buildings table
     * @param buildingId - The building ID to check
     * @param currentLevel - Current building level
     * @returns BuildingAvailability object with build status and details
     */
    private async checkBuildingAvailability(buildingRow: Locator, buildingId: string, currentLevel: number): Promise<BuildingAvailability> {
        try {
            // Get building configuration to check max level
            const buildingConfig = getBuildingConfig(buildingId);
            // Check if building is at max level
            if (buildingConfig && currentLevel >= buildingConfig.maxLevel) {
                return {
                    canBuild: false,
                    reason: 'Max level'
                };
            }
            // Find the build options cell (usually the last cell in the row)
            const buildOptionsCell = buildingRow.locator('td.build_options');
            const hasBuildOptions = await buildOptionsCell.count() > 0;
            if (!hasBuildOptions) {
                console.warn(`No build options cell found for building ${buildingId}`);
                return {
                    canBuild: false,
                    reason: 'No build options cell'
                };
            }

            // Check for build button (can build)
            const buildButton = buildOptionsCell.locator(`a.btn.btn-build[id^="main_buildlink_${buildingId}"]`);
            const hasBuildButton = await buildButton.count() > 0;
            if (hasBuildButton) {
                const buttonId = await buildButton.getAttribute('id');
                return {
                    canBuild: true,
                    buttonSelector: buttonId ? `#${buttonId}` : undefined
                };
            }
            // Check for "resources available at" message (cannot build yet)
            const inactiveSpan = buildOptionsCell.locator('span.inactive.center');
            const hasInactiveSpan = await inactiveSpan.count() > 0;
            if (hasInactiveSpan) {
                const inactiveText = await inactiveSpan.textContent() || '';
                // Look for time pattern "Surowce dostępne dzisiaj o 23:22" or "Surowce dostępne jutro o 13:19"
                const timeMatch = inactiveText.match(/Surowce dostępne (dzisiaj|jutro) o (\d{1,2}:\d{2})/);
                if (timeMatch) {
                    const [, dayType, time] = timeMatch;
                    const availableAt = `${dayType} o ${time}`;
                    console.log('v10');
                    return {
                        canBuild: false,
                        availableAt: availableAt
                    };
                }
                return {
                    canBuild: false,
                    reason: inactiveText.trim() || 'Resources not available'
                };
            }

            // If no clear indication found, assume cannot build
            return {
                canBuild: false,
                reason: 'Unknown build status'
            };

        } catch (error) {
            console.error(`Error checking building availability for ${buildingId}:`, error);
            return {
                canBuild: false,
                reason: 'Error checking availability'
            };
        }
    }

    /**
     * Parses Polish time format to Date object
     * Handles "dzisiaj o HH:MM" and "jutro o HH:MM" formats
     * @param timeString - Time string in Polish format
     * @returns Date object or null if parsing fails
     */
    private parsePolishTimeToDate(timeString: string): Date | null {
        try {
            const timeMatch = timeString.match(/(dzisiaj|jutro) o (\d{1,2}):(\d{2})/);

            if (!timeMatch) {
                console.warn(`Could not parse Polish time format: "${timeString}"`);
                return null;
            }

            const [, dayType, hoursStr, minutesStr] = timeMatch;
            const hours = parseInt(hoursStr, 10);
            const minutes = parseInt(minutesStr, 10);

            if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
                console.warn(`Invalid time values in: "${timeString}"`);
                return null;
            }

            const now = new Date();
            const targetDate = new Date(now);

            // Set the target time
            targetDate.setHours(hours, minutes, 0, 0);

            // If it's "jutro" (tomorrow), add one day
            if (dayType === 'jutro') {
                targetDate.setDate(targetDate.getDate() + 1);
            } else if (dayType === 'dzisiaj') {
                // If the time has already passed today, assume it's tomorrow
                if (targetDate.getTime() <= now.getTime()) {
                    targetDate.setDate(targetDate.getDate() + 1);
                }
            }

            return targetDate;

        } catch (error) {
            console.error(`Error parsing Polish time "${timeString}":`, error);
            return null;
        }
    }

    /**
     * Checks if a specific building can be built/upgraded
     * @param buildingId - The building ID to check
     * @returns BuildingAvailability object with build status and details
     */
    async checkBuildingBuildAvailability(buildingId: BuildingId | string): Promise<BuildingAvailability> {
        try {
            // Ensure we're on the main screen where buildings are visible
            const currentUrl = this.page.url();
            const villageIdMatch = currentUrl.match(/village=(\d+)/);

            if (!villageIdMatch) {
                console.warn('Could not extract village ID for building availability check');
                return {
                    canBuild: false,
                    reason: 'No village ID found'
                };
            }
            const villageId = villageIdMatch[1];
            if (!currentUrl.includes('screen=main')) {
                console.log('Navigating to main screen to check building availability');
                await this.navigateToVillage(villageId);
            }
            // Wait for buildings table to be visible
            await this.page.waitForSelector('#buildings', { timeout: 10000 });
            // Find the specific building row
            const buildingRow = this.page.locator(`#main_buildrow_${buildingId}`);
            const rowExists = await buildingRow.count() > 0;
            if (!rowExists) {
                console.warn(`Building row not found for ${buildingId}`);
                return {
                    canBuild: false,
                    reason: 'Building row not found'
                };
            }
            // Get current building level
            const currentLevel = await this.getBuildingLevel(buildingId);
            // Check building availability using our helper method
            const availability = await this.checkBuildingAvailability(buildingRow, buildingId, currentLevel);
            // If we have an availableAt time, try to parse it to a Date object
            if (availability.availableAt && !availability.canBuild) {
                const parsedDate = this.parsePolishTimeToDate(availability.availableAt);
                if (parsedDate) {
                    console.log(`Building ${buildingId} will be available at: ${parsedDate.toISOString()}`);
                }
            }
            return availability;
        } catch (error) {
            console.error(`Error checking building build availability for ${buildingId}:`, error);
            return {
                canBuild: false,
                reason: 'Error during availability check'
            };
        }
    }

    /**
     * Extracts army units from barracks, stable, and workshop
     * @returns ArmyUnits object with unit counts in each building
     */
    async extractArmyUnits(): Promise<ArmyUnits> {
        // TODO: Implement army units extraction
        // This should navigate to different buildings and extract unit counts
        const barracksUnits = await this.extractBarracksUnits();
        const stableUnits = await this.extractStableUnits();
        const workshopUnits = await this.extractWorkshopUnits();
        const churchUnits = await this.extractChurchUnits();

        return {
            barracks: barracksUnits,
            stable: stableUnits,
            workshop: workshopUnits,
            church: churchUnits
        };
    }

    /**
     * Extracts current build queue
     * @returns Array of BuildQueueItem objects
     */
    async extractBuildQueue(): Promise<BuildQueueItem[]> {
        try {
            // Get current village ID from URL for navigation purposes
            const currentUrl = this.page.url();
            const villageIdMatch = currentUrl.match(/village=(\d+)/);

            if (!villageIdMatch) {
                console.warn('Could not extract village ID from URL:', currentUrl);
                return [];
            }

            const villageId = villageIdMatch[1];

            // Ensure we're on the main screen where build queue is visible
            if (!currentUrl.includes('screen=main')) {
                console.log('Navigating to main screen to access build queue');
                await this.navigateToVillage(villageId);
            }

            // Wait for build queue wrapper to be present
            const buildQueueExists = await this.page.waitForSelector('#buildqueue_wrap', { timeout: 5000 }).catch(() => null);

            if (!buildQueueExists) {
                console.warn('Build queue wrapper not found - village might have empty build queue.');
                return [];
            }

            // Extract build queue items using direct HTML parsing
            const buildQueue = await this.parseBuildQueueFromHTML();

            console.log(`Successfully extracted ${buildQueue.length} items from build queue`);

            // Log queue items for debugging
            if (buildQueue.length > 0) {
                buildQueue.forEach((item, index) => {
                    console.log(`Queue item ${index + 1}: ${item.building} Level ${item.level} - ${item.timeRemaining} remaining (${item.timeRemainingSeconds}s)`);
                });
            } else {
                console.log('Build queue is empty');
            }

            return buildQueue;

        } catch (error) {
            console.error('Error extracting build queue:', error);

            // Try to provide helpful debugging information
            try {
                const currentUrl = this.page.url();
                console.warn(`Current page URL: ${currentUrl}`);

                // Check if we're on the right page
                const isMainScreen = currentUrl.includes('screen=main');
                if (!isMainScreen) {
                    console.warn('Not on main building screen - this might affect queue extraction');
                }

                // Check if build queue element exists at all
                const queueWrapperExists = await this.page.locator('#buildqueue_wrap').count() > 0;
                const queueTableExists = await this.page.locator('#build_queue').count() > 0;
                console.warn(`Build queue wrapper exists: ${queueWrapperExists}, table exists: ${queueTableExists}`);

            } catch (debugError) {
                console.warn('Could not gather debugging information:', debugError);
            }

            // Return empty array on error to prevent crashes in calling code
            return [];
        }
    }

    /**
     * Parses build queue directly from HTML structure
     * @returns Array of BuildQueueItem objects
     */
    private async parseBuildQueueFromHTML(): Promise<BuildQueueItem[]> {
        const buildQueue: BuildQueueItem[] = [];

        try {
            // Find all queue item rows - these have class patterns like "buildorder_*" but exclude progress rows
            const queueRows = await this.page.locator('#buildqueue tr').all();

            for (const row of queueRows) {
                // Get row classes to identify queue items vs headers/progress bars
                const rowClass = await row.getAttribute('class') || '';

                // Skip header row, progress rows, and rows without buildorder_ class
                if (!rowClass.includes('buildorder_') || rowClass.includes('order-progress')) {
                    continue;
                }

                try {
                    // Extract building info from first column
                    const firstColumn = row.locator('td').first();
                    const buildingText = await firstColumn.textContent() || '';

                    if (!buildingText.trim()) {
                        console.warn('Empty building text found in queue row, skipping');
                        continue;
                    }

                    // Parse building name and level from text like "Kuźnia\nPoziom 17"
                    const lines = buildingText.split('\n').map(line => line.trim()).filter(line => line.length > 0);

                    let buildingName = 'Unknown Building';
                    let level = 0;

                    // Find building name (first non-empty line that's not "Poziom X")
                    for (const line of lines) {
                        if (!line.includes('Poziom')) {
                            buildingName = line;
                            break;
                        }
                    }

                    // Find level from "Poziom X" pattern
                    const levelLine = lines.find(line => line.includes('Poziom'));
                    if (levelLine) {
                        const levelMatch = levelLine.match(/Poziom\s+(\d+)/);
                        if (levelMatch) {
                            level = parseInt(levelMatch[1], 10);
                        }
                    }

                    // Extract duration from second column
                    const durationColumn = row.locator('td').nth(1);
                    let timeRemaining = '00:00:00';
                    let timeRemainingSeconds = 0;

                    try {
                        // Look for span with data-endtime or just text content
                        const durationSpan = durationColumn.locator('span').first();
                        const hasDurationSpan = await durationSpan.count() > 0;

                        if (hasDurationSpan) {
                            timeRemaining = (await durationSpan.textContent() || '').trim();
                        } else {
                            timeRemaining = (await durationColumn.textContent() || '').trim();
                        }

                        // Parse time remaining into seconds
                        timeRemainingSeconds = this.parseTimeToSeconds(timeRemaining);

                    } catch (timeError) {
                        console.warn(`Error extracting duration for ${buildingName}:`, timeError);
                    }

                    // Create queue item
                    const queueItem: BuildQueueItem = {
                        building: buildingName,
                        level: level,
                        timeRemaining: timeRemaining,
                        timeRemainingSeconds: timeRemainingSeconds
                    };

                    buildQueue.push(queueItem);

                } catch (rowError) {
                    console.warn('Error parsing queue row:', rowError);
                    // Continue with other rows even if one fails
                    continue;
                }
            }

        } catch (parseError) {
            console.error('Error parsing build queue HTML:', parseError);
        }

        return buildQueue;
    }

    /**
     * Parses time string into seconds
     * Supports formats: HH:MM:SS, MM:SS, SS
     * @param timeString - Time string to parse
     * @returns Number of seconds
     */
    private parseTimeToSeconds(timeString: string): number {
        try {
            if (!timeString || timeString.trim() === '') {
                return 0;
            }

            const cleanTime = timeString.trim();
            const timeParts = cleanTime.split(':').map(part => parseInt(part, 10));

            if (timeParts.some(part => isNaN(part))) {
                console.warn(`Invalid time format: "${timeString}"`);
                return 0;
            }

            if (timeParts.length === 3) {
                // HH:MM:SS format
                return (timeParts[0] * 3600) + (timeParts[1] * 60) + timeParts[2];
            } else if (timeParts.length === 2) {
                // MM:SS format
                return (timeParts[0] * 60) + timeParts[1];
            } else if (timeParts.length === 1) {
                // Just seconds
                return timeParts[0];
            } else {
                console.warn(`Unsupported time format: "${timeString}"`);
                return 0;
            }

        } catch (error) {
            console.warn(`Error parsing time "${timeString}":`, error);
            return 0;
        }
    }

    /**
     * Extracts current research queue
     * @returns Array of ResearchQueueItem objects
     */
    async extractResearchQueue(): Promise<ResearchQueueItem[]> {
        // TODO: Implement research queue extraction
        // This should extract current research queue from academy
        // Placeholder implementation returning empty array
        return [];
    }

    /**
     * Extracts unit counts from barracks
     * @returns Object with barracks unit counts
     */
    private async extractBarracksUnits(): Promise<{ spear: number; sword: number; axe: number; archer: number }> {
        // Initialize with default values
        const barracksUnits = {
            spear: 0,
            sword: 0,
            axe: 0,
            archer: 0
        };

        try {
            // Get current village ID from URL
            const currentUrl = this.page.url();
            const villageIdMatch = currentUrl.match(/village=(\d+)/);

            if (!villageIdMatch) {
                console.warn('Could not extract village ID for barracks navigation');
                return barracksUnits;
            }

            const villageId = villageIdMatch[1];

            console.log(`Navigating to barracks for village ${villageId}`);
            await this.navigateToBarracks(villageId);

            // Check if barracks is built by looking for train form and page content
            const trainFormExists = await this.page.waitForSelector('#train_form', { timeout: 5000 }).catch(() => null);

            if (!trainFormExists) {
                // Check if the building is not built by looking for specific text
                const notBuiltHeader = await this.page.locator('h2:has-text("nie zbudowano")').count();
                const unavailableTable = await this.page.locator('table.vis th:has-text("Jeszcze niedostępne")').count();

                if (notBuiltHeader > 0 || unavailableTable > 0) {
                    console.log('Barracks is not built yet - returning zero units');
                    return barracksUnits;
                } else {
                    console.warn('Barracks page loaded but no train form found and no "not built" indicators');
                    return barracksUnits;
                }
            }

            // Extract unit counts from recruitment form
            const extractedUnits = await this.parseBarracksUnitsFromHTML();

            return extractedUnits;

        } catch (error) {
            console.error('Error extracting barracks units:', error);

            // Try to provide debugging information
            try {
                const currentUrl = this.page.url();
                console.warn(`Current page URL during barracks extraction: ${currentUrl}`);

                const isBarracksScreen = currentUrl.includes('screen=barracks');
                console.warn(`Is on barracks screen: ${isBarracksScreen}`);

                const trainFormExists = await this.page.locator('#train_form').count() > 0;
                const notBuiltExists = await this.page.locator('h2:has-text("nie zbudowano")').count() > 0;
                console.warn(`Train form exists: ${trainFormExists}, Not built header: ${notBuiltExists}`);

            } catch (debugError) {
                console.warn('Could not gather barracks debugging information:', debugError);
            }

            return barracksUnits;
        }
    }

    /**
     * Parses barracks unit counts directly from HTML structure
     * @returns Object with unit counts
     */
    private async parseBarracksUnitsFromHTML(): Promise<{ spear: number; sword: number; axe: number; archer: number }> {
        const barracksUnits = {
            spear: 0,
            sword: 0,
            axe: 0,
            archer: 0
        };

        try {
            // Find all unit rows in the recruitment table
            const unitRows = await this.page.locator('#train_form table.vis tbody tr').all();

            for (const row of unitRows) {
                try {
                    // Check if this row contains a unit (has data-unit attribute)
                    const unitLink = row.locator('a.unit_link[data-unit]');
                    const hasUnitLink = await unitLink.count() > 0;

                    if (!hasUnitLink) {
                        // Skip header rows and non-unit rows
                        continue;
                    }

                    // Get unit type from data-unit attribute
                    const unitType = await unitLink.getAttribute('data-unit');

                    if (!unitType || !['spear', 'sword', 'axe', 'archer'].includes(unitType)) {
                        console.warn(`Unknown or unsupported unit type: ${unitType}`);
                        continue;
                    }

                    // Extract unit count from "W wiosce/ogólnie" column (3rd column, index 2)
                    const countCell = row.locator('td').nth(2);
                    const countText = await countCell.textContent() || '';

                    // Parse format like "2464/2464" or "0/0" - we want the first number (current in village)
                    const countMatch = countText.trim().match(/^(\d+)\/\d+$/);

                    if (countMatch) {
                        const currentCount = parseInt(countMatch[1], 10);
                        barracksUnits[unitType as keyof typeof barracksUnits] = currentCount;
                    } else {
                        console.warn(`Could not parse unit count for ${unitType}: "${countText}"`);
                    }

                } catch (rowError) {
                    console.warn('Error parsing barracks unit row:', rowError);
                    // Continue with other rows even if one fails
                    continue;
                }
            }

        } catch (parseError) {
            console.error('Error parsing barracks units HTML:', parseError);
        }

        return barracksUnits;
    }

    /**
     * Extracts unit counts from stable
     * @returns Object with stable unit counts
     */
    private async extractStableUnits(): Promise<{ scout: number; light_cavalry: number; mounted_archer: number; heavy_cavalry: number }> {
        // Initialize with default values
        const stableUnits = {
            scout: 0,
            light_cavalry: 0,
            mounted_archer: 0,
            heavy_cavalry: 0
        };

        try {
            // Get current village ID from URL
            const currentUrl = this.page.url();
            const villageIdMatch = currentUrl.match(/village=(\d+)/);

            if (!villageIdMatch) {
                console.warn('Could not extract village ID for stable navigation');
                return stableUnits;
            }

            const villageId = villageIdMatch[1];

            console.log(`Navigating to stable for village ${villageId}`);
            await this.navigateToStable(villageId);

            // Check if stable is built by looking for train form and page content
            const trainFormExists = await this.page.waitForSelector('#train_form', { timeout: 5000 }).catch(() => null);

            if (!trainFormExists) {
                // Check if the building is not built by looking for specific text
                const notBuiltHeader = await this.page.locator('h2:has-text("nie zbudowano")').count();
                const unavailableTable = await this.page.locator('table.vis th:has-text("Jeszcze niedostępne")').count();

                if (notBuiltHeader > 0 || unavailableTable > 0) {
                    console.log('Stable is not built yet - returning zero units');
                    return stableUnits;
                } else {
                    console.warn('Stable page loaded but no train form found and no "not built" indicators');
                    return stableUnits;
                }
            }

            // Extract unit counts from recruitment form
            const extractedUnits = await this.parseStableUnitsFromHTML();

            return extractedUnits;

        } catch (error) {
            console.error('Error extracting stable units:', error);

            // Try to provide debugging information
            try {
                const currentUrl = this.page.url();
                console.warn(`Current page URL during stable extraction: ${currentUrl}`);

                const isStableScreen = currentUrl.includes('screen=stable');
                console.warn(`Is on stable screen: ${isStableScreen}`);

                const trainFormExists = await this.page.locator('#train_form').count() > 0;
                const notBuiltExists = await this.page.locator('h2:has-text("nie zbudowano")').count() > 0;
                console.warn(`Train form exists: ${trainFormExists}, Not built header: ${notBuiltExists}`);

            } catch (debugError) {
                console.warn('Could not gather stable debugging information:', debugError);
            }

            return stableUnits;
        }
    }

    /**
     * Parses stable unit counts directly from HTML structure
     * @returns Object with cavalry unit counts
     */
    private async parseStableUnitsFromHTML(): Promise<{ scout: number; light_cavalry: number; mounted_archer: number; heavy_cavalry: number }> {
        const stableUnits = {
            scout: 0,
            light_cavalry: 0,
            mounted_archer: 0,
            heavy_cavalry: 0
        };

        // Mapping from game unit IDs to our interface keys
        const unitMapping: Record<string, keyof typeof stableUnits> = {
            'spy': 'scout',           // Zwiadowca
            'light': 'light_cavalry', // Lekki kawalerzysta
            'marcher': 'mounted_archer', // Łucznik konny
            'heavy': 'heavy_cavalry'  // Ciężki kawalerzysta
        };

        try {
            // Find all unit rows in the recruitment table
            const unitRows = await this.page.locator('#train_form table.vis tbody tr').all();

            for (const row of unitRows) {
                try {
                    // Check if this row contains a unit (has data-unit attribute)
                    const unitLink = row.locator('a.unit_link[data-unit]');
                    const hasUnitLink = await unitLink.count() > 0;

                    if (!hasUnitLink) {
                        // Skip header rows and non-unit rows
                        continue;
                    }

                    // Get unit type from data-unit attribute
                    const gameUnitType = await unitLink.getAttribute('data-unit');

                    if (!gameUnitType) {
                        console.warn('Unit link found but no data-unit attribute');
                        continue;
                    }

                    // Map game unit type to our interface
                    const ourUnitType = unitMapping[gameUnitType];

                    if (!ourUnitType) {
                        console.warn(`Unknown or unsupported stable unit type: ${gameUnitType}`);
                        continue;
                    }

                    // Extract unit count from "W wiosce/ogólnie" column (3rd column, index 2)
                    const countCell = row.locator('td').nth(2);
                    const countText = await countCell.textContent() || '';

                    // Parse format like "928/928" or "0/0" - we want the first number (current in village)
                    const countMatch = countText.trim().match(/^(\d+)\/\d+$/);

                    if (countMatch) {
                        const currentCount = parseInt(countMatch[1], 10);
                        stableUnits[ourUnitType] = currentCount;
                    } else {
                        console.warn(`Could not parse unit count for ${gameUnitType}: "${countText}"`);
                    }

                } catch (rowError) {
                    console.warn('Error parsing stable unit row:', rowError);
                    // Continue with other rows even if one fails
                    continue;
                }
            }

        } catch (parseError) {
            console.error('Error parsing stable units HTML:', parseError);
        }

        return stableUnits;
    }

    /**
     * Extracts unit counts from workshop
     * @returns Object with workshop unit counts
     */
    private async extractWorkshopUnits(): Promise<{ ram: number; catapult: number }> {
        // Initialize with default values
        const workshopUnits = {
            ram: 0,
            catapult: 0
        };

        try {
            // Get current village ID from URL
            const currentUrl = this.page.url();
            const villageIdMatch = currentUrl.match(/village=(\d+)/);

            if (!villageIdMatch) {
                console.warn('Could not extract village ID for workshop navigation');
                return workshopUnits;
            }

            const villageId = villageIdMatch[1];

            console.log(`Navigating to workshop for village ${villageId}`);
            await this.navigateToWorkshop(villageId);

            // Check if workshop is built by looking for train form and page content
            const trainFormExists = await this.page.waitForSelector('#train_form', { timeout: 5000 }).catch(() => null);

            if (!trainFormExists) {
                // Check if the building is not built by looking for specific text
                const notBuiltHeader = await this.page.locator('h2:has-text("nie zbudowano")').count();
                const unavailableTable = await this.page.locator('table.vis th:has-text("Jeszcze niedostępne")').count();

                if (notBuiltHeader > 0 || unavailableTable > 0) {
                    console.log('Workshop is not built yet - returning zero units');
                    return workshopUnits;
                } else {
                    console.warn('Workshop page loaded but no train form found and no "not built" indicators');
                    return workshopUnits;
                }
            }

            // Extract unit counts from recruitment form
            const extractedUnits = await this.parseWorkshopUnitsFromHTML();

            return extractedUnits;

        } catch (error) {
            console.error('Error extracting workshop units:', error);

            // Try to provide debugging information
            try {
                const currentUrl = this.page.url();
                console.warn(`Current page URL during workshop extraction: ${currentUrl}`);

                const isWorkshopScreen = currentUrl.includes('screen=garage');
                console.warn(`Is on workshop screen: ${isWorkshopScreen}`);

                const trainFormExists = await this.page.locator('#train_form').count() > 0;
                const notBuiltExists = await this.page.locator('h2:has-text("nie zbudowano")').count() > 0;
                console.warn(`Train form exists: ${trainFormExists}, Not built header: ${notBuiltExists}`);

            } catch (debugError) {
                console.warn('Could not gather workshop debugging information:', debugError);
            }

            return workshopUnits;
        }
    }

    /**
     * Parses workshop unit counts directly from HTML structure
     * @returns Object with siege unit counts
     */
    private async parseWorkshopUnitsFromHTML(): Promise<{ ram: number; catapult: number }> {
        const workshopUnits = {
            ram: 0,
            catapult: 0
        };

        // Mapping from game unit IDs to our interface keys
        const unitMapping: Record<string, keyof typeof workshopUnits> = {
            'ram': 'ram',           // Taran
            'catapult': 'catapult'  // Katapulta
        };

        try {
            // Find all unit rows in the recruitment table
            const unitRows = await this.page.locator('#train_form table.vis tbody tr').all();

            for (const row of unitRows) {
                try {
                    // Check if this row contains a unit (has data-unit attribute)
                    const unitLink = row.locator('a.unit_link[data-unit]');
                    const hasUnitLink = await unitLink.count() > 0;

                    if (!hasUnitLink) {
                        // Skip header rows and non-unit rows
                        continue;
                    }

                    // Get unit type from data-unit attribute
                    const gameUnitType = await unitLink.getAttribute('data-unit');

                    if (!gameUnitType) {
                        console.warn('Unit link found but no data-unit attribute');
                        continue;
                    }

                    // Map game unit type to our interface
                    const ourUnitType = unitMapping[gameUnitType];

                    if (!ourUnitType) {
                        console.warn(`Unknown or unsupported workshop unit type: ${gameUnitType}`);
                        continue;
                    }

                    // Extract unit count from "W wiosce/ogólnie" column (3rd column, index 2)
                    const countCell = row.locator('td').nth(2);
                    const countText = await countCell.textContent() || '';

                    // Parse format like "70/70" or "0/0" - we want the first number (current in village)
                    const countMatch = countText.trim().match(/^(\d+)\/\d+$/);

                    if (countMatch) {
                        const currentCount = parseInt(countMatch[1], 10);
                        workshopUnits[ourUnitType] = currentCount;
                    } else {
                        console.warn(`Could not parse unit count for ${gameUnitType}: "${countText}"`);
                    }

                } catch (rowError) {
                    console.warn('Error parsing workshop unit row:', rowError);
                    // Continue with other rows even if one fails
                    continue;
                }
            }

        } catch (parseError) {
            console.error('Error parsing workshop units HTML:', parseError);
        }

        return workshopUnits;
    }

    /**
     * Extracts unit counts from church (if exists)
     * @returns Object with church unit counts or undefined
     */
    private async extractChurchUnits(): Promise<{ paladin: number } | undefined> {
        // TODO: Check if church exists and extract paladin count
        // Placeholder implementation
        return {
            paladin: 0
        };
    }

    /**
     * Navigates to barracks page
     */
    private async navigateToBarracks(villageId: string): Promise<void> {
        const barracksUrl = `https://pl214.plemiona.pl/game.php?village=${villageId}&screen=barracks`;
        await this.page.goto(barracksUrl, { waitUntil: 'networkidle' });
    }

    /**
     * Navigates to stable page
     */
    private async navigateToStable(villageId: string): Promise<void> {
        const stableUrl = `https://pl214.plemiona.pl/game.php?village=${villageId}&screen=stable`;
        await this.page.goto(stableUrl, { waitUntil: 'networkidle' });
    }

    /**
     * Navigates to workshop page
     */
    private async navigateToWorkshop(villageId: string): Promise<void> {
        const workshopUrl = `https://pl214.plemiona.pl/game.php?village=${villageId}&screen=garage`;
        await this.page.goto(workshopUrl, { waitUntil: 'networkidle' });
    }

    /**
     * Navigates to church page
     */
    private async navigateToChurch(villageId: string): Promise<void> {
        const churchUrl = `https://pl214.plemiona.pl/game.php?village=${villageId}&screen=church`;
        await this.page.goto(churchUrl, { waitUntil: 'networkidle' });
    }

    /**
     * Navigates to academy page
     */
    private async navigateToAcademy(villageId: string): Promise<void> {
        const academyUrl = `https://pl214.plemiona.pl/game.php?village=${villageId}&screen=tech`;
        await this.page.goto(academyUrl, { waitUntil: 'networkidle' });
    }

    /**
     * Gets the level of a specific building by its ID
     * @param buildingId - The building ID to check (e.g., 'main', 'barracks', 'stable')
     * @returns Promise with building level (0 if not built)
     */
    async getBuildingLevel(buildingId: BuildingId | string): Promise<number> {
        try {
            // Get current village ID from URL
            const currentUrl = this.page.url();
            const villageIdMatch = currentUrl.match(/village=(\d+)/);

            if (!villageIdMatch) {
                console.warn('Could not extract village ID for building level check');
                return 0;
            }

            const villageId = villageIdMatch[1];

            // Ensure we're on the main screen where buildings are visible
            if (!currentUrl.includes('screen=main')) {
                console.log('Navigating to main screen to check building level');
                await this.navigateToVillage(villageId);
            }

            // Wait for buildings table to be visible
            await this.page.waitForSelector('#buildings', { timeout: 10000 });

            // Look for the specific building row
            const buildingRow = this.page.locator(`#main_buildrow_${buildingId}`);
            const buildingExists = await buildingRow.count() > 0;

            if (!buildingExists) {
                console.log(`Building ${buildingId} not found in buildings table - might not be built yet`);
                return 0;
            }

            // Extract building level from the name cell
            const nameCell = buildingRow.locator('td:first-child');
            const nameText = await nameCell.textContent() || '';

            // Look for "Poziom X" pattern in the text
            const levelMatch = nameText.match(/Poziom (\d+)/);
            const level = levelMatch ? parseInt(levelMatch[1], 10) : 0;

            console.log(`Building ${buildingId} is at level ${level}`);
            return level;

        } catch (error) {
            console.error(`Error getting building level for ${buildingId}:`, error);
            return 0;
        }
    }

    /**
     * Checks if a specific building is built (level > 0)
     * @param buildingId - The building ID to check
     * @returns Promise with boolean indicating if building is built
     */
    async isBuildingBuilt(buildingId: BuildingId | string): Promise<boolean> {
        const level = await this.getBuildingLevel(buildingId);
        return level > 0;
    }

    /**
     * Gets building level with additional building information
     * @param buildingId - The building ID to check
     * @returns Promise with detailed building information
     */
    async getBuildingInfo(buildingId: BuildingId | string): Promise<{
        id: string;
        level: number;
        isBuilt: boolean;
        config?: BuildingConfig;
        canUpgrade?: boolean;
        maxLevel?: number;
    }> {
        try {
            const level = await this.getBuildingLevel(buildingId);
            const config = getBuildingConfig(buildingId);

            return {
                id: buildingId,
                level: level,
                isBuilt: level > 0,
                config: config,
                canUpgrade: config ? level < config.maxLevel : undefined,
                maxLevel: config?.maxLevel
            };

        } catch (error) {
            console.error(`Error getting building info for ${buildingId}:`, error);
            return {
                id: buildingId,
                level: 0,
                isBuilt: false
            };
        }
    }

    /**
     * Checks if building requirements are met for a specific building
     * @param buildingId - The building ID to check requirements for
     * @returns Promise with requirements check result
     */
    async checkBuildingRequirements(buildingId: BuildingId | string): Promise<{
        met: boolean;
        missingRequirements: BuildingRequirement[];
        currentLevels: BuildingLevels;
    }> {
        try {
            // Get all current building levels
            const currentLevels = await this.extractBuildingLevels();

            // Check requirements using the helper function
            const requirementCheck = areBuildingRequirementsMet(buildingId, currentLevels);

            return {
                met: requirementCheck.met,
                missingRequirements: requirementCheck.missingRequirements,
                currentLevels: currentLevels
            };

        } catch (error) {
            console.error(`Error checking building requirements for ${buildingId}:`, error);
            return {
                met: false,
                missingRequirements: [],
                currentLevels: this.getDefaultBuildingLevels()
            };
        }
    }

    /**
     * Gets a list of all buildings that can be upgraded
     * @returns Promise with array of buildings that can be upgraded
     */
    async getUpgradeableBuildingsList(): Promise<Array<{
        id: string;
        name: string;
        currentLevel: number;
        maxLevel: number;
        canUpgrade: boolean;
        requirementsMet: boolean;
    }>> {
        try {
            const upgradeableBuildings: Array<{
                id: string;
                name: string;
                currentLevel: number;
                maxLevel: number;
                canUpgrade: boolean;
                requirementsMet: boolean;
            }> = [];

            const currentLevels = await this.extractBuildingLevels();

            // Check each building from our configuration
            for (const [_, buildingConfig] of Object.entries(TRIBAL_WARS_BUILDINGS)) {
                const currentLevel = await this.getBuildingLevel(buildingConfig.id);
                const requirementCheck = areBuildingRequirementsMet(buildingConfig.id, currentLevels);

                const canUpgrade = currentLevel < buildingConfig.maxLevel;

                if (canUpgrade || currentLevel > 0) { // Include built buildings or those that can be built
                    upgradeableBuildings.push({
                        id: buildingConfig.id,
                        name: buildingConfig.name,
                        currentLevel: currentLevel,
                        maxLevel: buildingConfig.maxLevel,
                        canUpgrade: canUpgrade,
                        requirementsMet: requirementCheck.met
                    });
                }
            }

            // Sort by current level descending, then by name
            upgradeableBuildings.sort((a, b) => {
                if (a.currentLevel !== b.currentLevel) {
                    return b.currentLevel - a.currentLevel;
                }
                return a.name.localeCompare(b.name);
            });

            return upgradeableBuildings;

        } catch (error) {
            console.error('Error getting upgradeable buildings list:', error);
            return [];
        }
    }
} 