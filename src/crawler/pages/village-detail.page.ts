import { Page, Locator } from 'playwright';
import { BuildingLevels, ArmyUnits, BuildQueueItem, ResearchQueueItem } from './village-overview.page';

// Building requirements interface
interface BuildingRequirement {
    buildingId: string;
    level: number;
}

// Building configuration interface
interface BuildingConfig {
    id: string;
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
        id: 'main',
        name: 'Ratusz',
        screen: 'main',
        maxLevel: 30,
        requirements: [],
        availableOnAllWorlds: true,
        description: 'Centralny budynek wioski, umożliwiający budowę i rozbudowę innych struktur'
    },

    // Resource buildings
    WOOD: {
        id: 'wood',
        name: 'Tartak',
        screen: 'wood',
        maxLevel: 30,
        requirements: [{ buildingId: 'main', level: 1 }],
        availableOnAllWorlds: true,
        description: 'Produkuje drewno'
    },
    STONE: {
        id: 'stone',
        name: 'Cegielnia',
        screen: 'stone',
        maxLevel: 30,
        requirements: [{ buildingId: 'main', level: 1 }],
        availableOnAllWorlds: true,
        description: 'Produkuje glinę'
    },
    IRON: {
        id: 'iron',
        name: 'Huta Żelaza',
        screen: 'iron',
        maxLevel: 30,
        requirements: [{ buildingId: 'main', level: 1 }],
        availableOnAllWorlds: true,
        description: 'Produkuje żelazo'
    },

    // Infrastructure buildings
    FARM: {
        id: 'farm',
        name: 'Zagroda',
        screen: 'farm',
        maxLevel: 30,
        requirements: [{ buildingId: 'main', level: 1 }],
        availableOnAllWorlds: true,
        description: 'Zapewnia żywność dla mieszkańców i wojsk, zwiększając limit populacji'
    },
    STORAGE: {
        id: 'storage',
        name: 'Spichlerz',
        screen: 'storage',
        maxLevel: 30,
        requirements: [{ buildingId: 'main', level: 1 }],
        availableOnAllWorlds: true,
        description: 'Magazynuje surowce'
    },
    HIDE: {
        id: 'hide',
        name: 'Schowek',
        screen: 'hide',
        maxLevel: 10,
        requirements: [{ buildingId: 'main', level: 1 }],
        availableOnAllWorlds: true,
        description: 'Pozwala ukryć część surowców przed grabieżą wrogów'
    },
    PLACE: {
        id: 'place',
        name: 'Plac',
        screen: 'place',
        maxLevel: 1,
        requirements: [{ buildingId: 'main', level: 1 }],
        availableOnAllWorlds: true,
        description: 'Miejsce zbiórki wojsk, skąd można wysyłać ataki i wsparcie'
    },

    // Military buildings
    BARRACKS: {
        id: 'barracks',
        name: 'Koszary',
        screen: 'barracks',
        maxLevel: 25,
        requirements: [{ buildingId: 'main', level: 3 }],
        availableOnAllWorlds: true,
        description: 'Umożliwiają rekrutację jednostek piechoty'
    },
    STABLE: {
        id: 'stable',
        name: 'Stajnia',
        screen: 'stable',
        maxLevel: 20,
        requirements: [
            { buildingId: 'main', level: 10 },
            { buildingId: 'barracks', level: 5 },
            { buildingId: 'smith', level: 5 }
        ],
        availableOnAllWorlds: true,
        description: 'Pozwala na rekrutację jednostek kawalerii'
    },
    GARAGE: {
        id: 'garage',
        name: 'Warsztat',
        screen: 'garage',
        maxLevel: 15,
        requirements: [
            { buildingId: 'main', level: 10 },
            { buildingId: 'smith', level: 10 }
        ],
        availableOnAllWorlds: true,
        description: 'Umożliwia produkcję machin oblężniczych'
    },
    SMITH: {
        id: 'smith',
        name: 'Kuźnia',
        screen: 'smith',
        maxLevel: 20,
        requirements: [{ buildingId: 'main', level: 3 }], // Estimated requirement
        availableOnAllWorlds: true,
        description: 'Służy do badania nowych technologii i ulepszania jednostek'
    },
    WALL: {
        id: 'wall',
        name: 'Mur Obronny',
        screen: 'wall',
        maxLevel: 20,
        requirements: [{ buildingId: 'barracks', level: 1 }],
        availableOnAllWorlds: true,
        description: 'Zwiększa obronę wioski oraz siłę obronną stacjonujących wojsk'
    },

    // Economic buildings
    MARKET: {
        id: 'market',
        name: 'Rynek',
        screen: 'market',
        maxLevel: 25,
        requirements: [
            { buildingId: 'main', level: 3 }, // Estimated requirement
            { buildingId: 'storage', level: 2 } // Estimated requirement
        ],
        availableOnAllWorlds: true,
        description: 'Umożliwia handel surowcami z innymi graczami oraz przesyłanie surowców'
    },

    // Advanced buildings
    SNOB: {
        id: 'snob',
        name: 'Pałac',
        screen: 'snob',
        maxLevel: 3, // Can be 1 or 3 depending on world settings
        requirements: [
            { buildingId: 'main', level: 20 },
            { buildingId: 'smith', level: 20 },
            { buildingId: 'market', level: 10 }
        ],
        availableOnAllWorlds: true,
        description: 'Umożliwia produkcję szlachciców, którzy są niezbędni do przejmowania wiosek'
    },

    // World-dependent buildings
    CHURCH: {
        id: 'church',
        name: 'Kościół',
        screen: 'church',
        maxLevel: 3, // Estimated max level
        requirements: [
            { buildingId: 'main', level: 5 },
            { buildingId: 'farm', level: 5 }
        ],
        availableOnAllWorlds: false,
        description: 'Wzmacnia morale wojsk w wioskach znajdujących się w jego strefie wpływów'
    },
    FIRST_CHURCH: {
        id: 'first_church',
        name: 'Pierwszy Kościół',
        screen: 'church',
        maxLevel: 3, // Estimated max level
        requirements: [
            { buildingId: 'main', level: 5 },
            { buildingId: 'farm', level: 5 }
        ],
        availableOnAllWorlds: false,
        description: 'Unikalny kościół, możliwy do zbudowania tylko w jednej wiosce'
    },
    WATCHTOWER: {
        id: 'watchtower',
        name: 'Wieża Strażnicza',
        screen: 'watchtower',
        maxLevel: 20, // Estimated max level
        requirements: [{ buildingId: 'main', level: 5 }], // Estimated requirement
        availableOnAllWorlds: false,
        description: 'Zwiększa zasięg widzenia wojsk'
    },
    STATUE: {
        id: 'statue',
        name: 'Piedestał',
        screen: 'statue',
        maxLevel: 1,
        requirements: [{ buildingId: 'main', level: 1 }], // Estimated requirement
        availableOnAllWorlds: false,
        description: 'Miejsce mianowania nowego rycerza'
    }
} as const;

// Helper function to get building configuration
export function getBuildingConfig(buildingId: string): BuildingConfig | undefined {
    return Object.values(TRIBAL_WARS_BUILDINGS).find(building => building.id === buildingId);
}

// Helper function to get building by screen name
export function getBuildingByScreen(screen: string): BuildingConfig | undefined {
    return Object.values(TRIBAL_WARS_BUILDINGS).find(building => building.screen === screen);
}

// Helper function to check if building requirements are met
export function areBuildingRequirementsMet(
    buildingId: string,
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
     * Extracts building levels from the village main page
     * Uses logic similar to BuildingPage.getAllBuildings() but focused only on levels
     * @returns BuildingLevels object with all building levels
     */
    async extractBuildingLevels(): Promise<BuildingLevels> {
        try {
            // Wait for buildings table to be visible
            await this.page.waitForSelector('#buildings', { timeout: 10000 });

            // Initialize building levels with default values
            const buildingLevels: BuildingLevels = {
                headquarters: 0,
                barracks: 0,
                stable: 0,
                workshop: 0,
                church: 0,
                academy: 0,
                smithy: 0,
                rally_point: 0,
                statue: 0,
                market: 0,
                timber_camp: 0,
                clay_pit: 0,
                iron_mine: 0,
                farm: 0,
                warehouse: 0,
                hiding_place: 0,
                wall: 0
            };

            // Map building IDs from the game to our interface keys
            const buildingMapping: Record<string, keyof BuildingLevels> = {
                'main': 'headquarters',
                'barracks': 'barracks',
                'stable': 'stable',
                'garage': 'workshop', // Workshop is called 'garage' in the game
                'church': 'church',
                'snob': 'academy', // Academy is called 'snob' in the game
                'smith': 'smithy',
                'place': 'rally_point',
                'statue': 'statue',
                'market': 'market',
                'wood': 'timber_camp',
                'stone': 'clay_pit',
                'iron': 'iron_mine',
                'farm': 'farm',
                'storage': 'warehouse',
                'hide': 'hiding_place',
                'wall': 'wall'
            };

            // Process available buildings (same logic as getAllBuildings but focused on levels)
            const buildingRows = this.page.locator('#buildings tbody tr[id^="main_buildrow_"]');
            const rowCount = await buildingRows.count();

            for (let i = 0; i < rowCount; i++) {
                const row = buildingRows.nth(i);
                const rowId = await row.getAttribute('id') || '';
                const buildingId = rowId.replace('main_buildrow_', '');

                // Skip if no valid ID
                if (!buildingId) continue;

                // Extract building level from the name cell
                const nameCell = row.locator('td:first-child');
                const nameText = await nameCell.textContent() || '';

                // Look for "Poziom X" pattern in the text
                const levelMatch = nameText.match(/Poziom (\d+)/);
                const level = levelMatch ? parseInt(levelMatch[1], 10) : 0;

                // Map the building ID to our interface and set the level
                const mappedKey = buildingMapping[buildingId];
                if (mappedKey) {
                    buildingLevels[mappedKey] = level;
                    console.log(`Extracted ${buildingId} (${mappedKey}) = Level ${level}`);
                }
            }

            return buildingLevels;

        } catch (error) {
            console.error('Error extracting building levels:', error);
            // Return default levels on error
            return {
                headquarters: 0,
                barracks: 0,
                stable: 0,
                workshop: 0,
                church: 0,
                academy: 0,
                smithy: 0,
                rally_point: 0,
                statue: 0,
                market: 0,
                timber_camp: 0,
                clay_pit: 0,
                iron_mine: 0,
                farm: 0,
                warehouse: 0,
                hiding_place: 0,
                wall: 0
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
                console.warn('Build queue wrapper not found - village might not have build queue functionality');
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

            console.log('Extracted barracks units:', extractedUnits);
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
                        console.log(`Found ${unitType}: ${currentCount} units in village`);
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

            console.log('Extracted stable units:', extractedUnits);
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
                        console.log(`Found ${gameUnitType} (${ourUnitType}): ${currentCount} units in village`);
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

            console.log('Extracted workshop units:', extractedUnits);
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
                        console.log(`Found ${gameUnitType} (${ourUnitType}): ${currentCount} units in village`);
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
} 