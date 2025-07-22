import { Page, Locator } from 'playwright';

// Interface for building levels
export interface BuildingLevels {
	main: number;
	barracks: number;
	stable: number;
	garage: number;
	church: number;
	snob: number;
	smith: number;
	place: number;
	statue: number;
	market: number;
	wood: number;
	stone: number;
	iron: number;
	farm: number;
	storage: number;
	hide: number;
	wall: number;
}

// Interface for army units in different buildings
export interface ArmyUnits {
	barracks: {
		spear: number;
		sword: number;
		axe: number;
		archer: number;
	};
	stable: {
		scout: number;
		light_cavalry: number;
		mounted_archer: number;
		heavy_cavalry: number;
	};
	workshop: {
		ram: number;
		catapult: number;
	};
	church?: {
		paladin: number;
	};
}

// Interface for build queue item
export interface BuildQueueItem {
	building: string;
	level: number;
	timeRemaining: string; // Format: "HH:MM:SS"
	timeRemainingSeconds: number;
}

// Interface for research queue item
export interface ResearchQueueItem {
	technology: string;
	timeRemaining: string;
	timeRemainingSeconds: number;
}

// Interface for detailed village data structure
export interface VillageData {
	id: string;
	name: string;
	coordinates: string;
	points: number;
	resources: {
		wood: number;
		clay: number;
		iron: number;
	};
	storage: number;
	population: {
		current: number;
		max: number;
	};
	// Extended data - will be populated by detailed scraping
	buildingLevels?: BuildingLevels;
	armyUnits?: ArmyUnits;
	buildQueue?: BuildQueueItem[];
	researchQueue?: ResearchQueueItem[];
}

// Page Object Model for Plemiona Village Overview page
export class VillageOverviewPage {
	private readonly page: Page;
	private readonly productionTable: Locator;

	// URL pattern for village overview
	private readonly VILLAGE_OVERVIEW_URL = 'https://pl216.plemiona.pl/game.php?screen=overview_villages&mode=prod';

	constructor(page: Page) {
		this.page = page;
		this.productionTable = page.locator('#production_table');
	}

	/**
	 * Navigates to the village overview page
	 */
	async navigate(): Promise<void> {
		await this.page.goto(this.VILLAGE_OVERVIEW_URL, { waitUntil: 'networkidle' });
		
		await this.page.waitForSelector('#production_table', { timeout: 10000 });
	}

	/**
	 * Extracts all village data from the overview table
	 * @returns Array of VillageData objects
	 */
	async extractVillageData(): Promise<VillageData[]> {
		const villages: VillageData[] = [];

		// Get all village rows from the table body
		const villageRows = await this.productionTable.locator('tbody tr').all();

		for (const row of villageRows) {
			try {
				const villageData = await this.extractSingleVillageData(row);
				if (villageData) {
					villages.push(villageData);
				}
			} catch (error) {
				console.warn('Failed to extract data for a village row:', error);
				// Continue with other villages even if one fails
			}
		}

		return villages;
	}

	/**
	 * Extracts data from a single village row
	 * @param row - The table row locator
	 * @returns VillageData object or null if extraction fails
	 */
	private async extractSingleVillageData(row: Locator): Promise<VillageData | null> {
		try {
			// Extract village ID from data-id attribute
			const villageIdElement = row.locator('.quickedit-vn');
			const villageId = await villageIdElement.getAttribute('data-id');

			if (!villageId) {
				throw new Error('Village ID not found');
			}

			// Extract village name and coordinates
			const villageNameElement = row.locator('.quickedit-label');
			const fullNameText = await villageNameElement.textContent();

			if (!fullNameText) {
				throw new Error('Village name not found');
			}

			// Parse name and coordinates from text like "0001 (607|465) K46"
			const nameMatch = fullNameText.trim().match(/^(.+?)\s+\((\d+\|\d+)\)/);
			const name = nameMatch ? nameMatch[1].trim() : fullNameText.trim();
			const coordinates = nameMatch ? nameMatch[2] : '';

			// Extract points (remove dots/grey spans)
			const pointsCell = row.locator('td').nth(1);
			const pointsText = await pointsCell.textContent();
			const points = pointsText ? parseInt(pointsText.replace(/\./g, '').replace(/\s/g, ''), 10) : 0;

			// Extract resources (wood, clay, iron)
			// const resourcesCell = row.locator('td').nth(2);
			const woodElement = row.locator('.wood');
			const clayElement = row.locator('.stone'); // Note: stone = clay in Plemiona
			const ironElement = row.locator('.iron');

			const woodText = await woodElement.textContent();
			const clayText = await clayElement.textContent();
			const ironText = await ironElement.textContent();

			const wood = woodText ? parseInt(woodText.replace(/\./g, '').replace(/\s/g, ''), 10) : 0;
			const clay = clayText ? parseInt(clayText.replace(/\./g, '').replace(/\s/g, ''), 10) : 0;
			const iron = ironText ? parseInt(ironText.replace(/\./g, '').replace(/\s/g, ''), 10) : 0;

			// Extract storage capacity
			const storageCell = row.locator('td').nth(3);
			const storageText = await storageCell.textContent();
			const storage = storageText ? parseInt(storageText.replace(/\./g, '').replace(/\s/g, ''), 10) : 0;

			// Extract population (current/max)
			const populationCell = row.locator('td').nth(4);
			const populationText = await populationCell.textContent();
			let currentPop = 0;
			let maxPop = 0;

			if (populationText) {
				const popMatch = populationText.match(/(\d+)\/(\d+)/);
				if (popMatch) {
					currentPop = parseInt(popMatch[1], 10);
					maxPop = parseInt(popMatch[2], 10);
				}
			}

			return {
				id: villageId,
				name,
				coordinates,
				points,
				resources: {
					wood,
					clay,
					iron
				},
				storage,
				population: {
					current: currentPop,
					max: maxPop
				}
			};

		} catch (error) {
			console.error('Error extracting village data from row:', error);
			return null;
		}
	}

	/**
	 * Gets the total number of villages
	 * @returns Number of villages found
	 */
	async getVillageCount(): Promise<number> {
		const rows = await this.productionTable.locator('tbody tr').count();
		return rows;
	}

	/**
	 * Waits for the village overview table to be loaded
	 */
	async waitForTableLoad(): Promise<void> {
		await this.productionTable.waitFor({ state: 'visible', timeout: 10000 });
		// Wait a bit more for dynamic content to load
		await this.page.waitForTimeout(1000);
	}
} 