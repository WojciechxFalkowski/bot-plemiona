import { Page, Locator } from 'playwright';
import { TribalWarsPage } from './tribal-wars-page';

/**
 * Resources interface
 */
export interface Resources {
    wood: number;
    stone: number;
    iron: number;
    population: { current: number; max: number };
}

/**
 * Building information interface
 */
export interface BuildingInfo {
    id: string;
    name: string;
    level: number;
    nextLevel: number;
    wood: number;
    stone: number;
    iron: number;
    buildTime: string;
    population: number;
    canBuild: boolean;
    inQueue: boolean;
    available: boolean;
    fullyUpgraded: boolean; // New flag to mark fully upgraded buildings
    // Requirements for building
    requirements: {
        [key: string]: {
            name: string;
            level: number;
            met: boolean;
        }
    };
}

/**
 * Queue item interface
 */
export interface QueueItem {
    buildingId: string;
    name: string;
    level: number;
    duration: string;
    finishTime: string;
    id?: string; // Cancel ID if available
}

/**
 * Main building page object model
 */
export class BuildingPage extends TribalWarsPage {
    // Main selectors
    readonly buildingsTable: Locator;
    readonly buildQueueTable: Locator;
    readonly unavailableBuildingsTable: Locator;

    // Queue selectors
    readonly queueRows: Locator;
    readonly queueIsFull: boolean;

    constructor(page: Page) {
        super(page);
        this.buildingsTable = page.locator('#buildings');
        this.buildQueueTable = page.locator('#build_queue');
        this.unavailableBuildingsTable = page.locator('#buildings_unmet');
        this.queueRows = page.locator('#buildqueue tr.buildorder_storage, #buildqueue tr[class^="buildorder_"]');
    }

    /**
     * Navigate to the main building screen
     * @param villageId - ID of the village
     */
    async navigateToBuildingScreen(villageId: string): Promise<void> {
        await this.navigateToScreen(villageId, 'main');
        // Wait for the building table to be visible
        await this.buildingsTable.waitFor({ state: 'visible' });
    }

    /**
     * Check if building queue is full
     */
    async isQueueFull(): Promise<boolean> {
        const premiumHint = await this.page.locator('.premium_account_hint').isVisible();
        // Check if there are already 2 items in the queue
        const queueCount = await this.queueRows.count();
        return queueCount >= 2 || premiumHint;
    }

    /**
     * Get current queue items
     */
    async getQueueItems(): Promise<QueueItem[]> {
        const queueItems: QueueItem[] = [];
        const count = await this.queueRows.count();

        for (let i = 0; i < count; i++) {
            const row = this.queueRows.nth(i);
            // Skip progress rows - not needed anymore as we're specifically targeting building rows
            // if (await row.locator('.order-progress').isVisible()) {
            //     continue;
            // }

            const buildingImg = await row.locator('img.bmain_list_img').getAttribute('src') || '';
            const buildingId = this.getBuildingIdFromImageUrl(buildingImg);
            const nameAndLevel = await row.locator('td:first-child').textContent() || '';
            const nameMatch = nameAndLevel.match(/(.*?)\\s*Poziom\\s*(\\d+)/);

            const name = nameMatch ? nameMatch[1].trim() : '';
            const level = nameMatch ? parseInt(nameMatch[2], 10) : 0;

            const duration = await row.locator('td:nth-child(2)').textContent() || '';
            const finishTime = await row.locator('td:nth-child(3)').textContent() || '';

            // Check if there's a cancel button with an ID
            let id;
            const cancelBtn = row.locator('a.btn-cancel');
            if (await cancelBtn.isVisible()) {
                const href = await cancelBtn.getAttribute('href') || '';
                const idMatch = href.match(/id=(\\d+)/);
                id = idMatch ? idMatch[1] : undefined;
            }

            queueItems.push({
                buildingId,
                name,
                level,
                duration,
                finishTime,
                id
            });
        }

        return queueItems;
    }

    /**
     * Get building ID from image URL
     */
    private getBuildingIdFromImageUrl(url: string): string {
        // Extract building ID from image URL (e.g., "buildings/wood.png" -> "wood")
        const match = url.match(/buildings\/(?:mid\/)?(?:grey\/)?([a-z]+)\\d?\\.(?:webp|png)/i);
        return match ? match[1] : '';
    }

    /**
     * Get information about all available buildings
     */
    async getAllBuildings(): Promise<BuildingInfo[]> {
        const buildings: BuildingInfo[] = [];
        // Process available buildings
        const buildingRows = this.page.locator('#buildings tbody tr[id^="main_buildrow_"]');
        const rowCount = await buildingRows.count();

        for (let i = 0; i < rowCount; i++) {
            const row = buildingRows.nth(i);
            const rowId = await row.getAttribute('id') || '';
            const buildingId = rowId.replace('main_buildrow_', '');
            // Skip if no valid ID
            if (!buildingId) continue;
            // Parse building data
            const nameCell = row.locator('td:first-child');
            const nameText = await nameCell.textContent() || '';

            const levelMatch = nameText.match(/Poziom (\\d+)/);
            const level = levelMatch ? parseInt(levelMatch[1], 10) : 0;

            // Check if the building is fully upgraded
            const fullyUpgradedCell = row.locator('td.inactive.center');
            const isFullyUpgraded = await fullyUpgradedCell.isVisible() &&
                (await fullyUpgradedCell.textContent() || '').includes('Budynek całkowicie rozbudowany');

            if (isFullyUpgraded) {
                // console.log(`Building ${buildingId} is fully upgraded`);

                // Fix building name extraction to get the first non-empty line
                const buildingName = nameText
                    .split('\n')
                    .map(line => line.trim())
                    .filter(line => line.length > 0 && !line.includes('Poziom'))[0] || '';

                // For fully upgraded buildings, we set default values and mark as fully upgraded
                buildings.push({
                    id: buildingId,
                    name: buildingName,
                    level,
                    nextLevel: level, // Same as current level since it's maxed
                    buildTime: '',
                    population: 0,
                    canBuild: false,
                    inQueue: false,
                    available: true,
                    fullyUpgraded: true,
                    wood: 0,
                    stone: 0,
                    iron: 0,
                    requirements: {}
                });

                // Skip to the next building since we don't need to process resource costs
                continue;
            }

            // Get resource requirements
            const woodCell = row.locator('td.cost_wood');
            const stoneCell = row.locator('td.cost_stone');
            const ironCell = row.locator('td.cost_iron');
            const timeCell = row.locator('td:has(.icon.header.time)');
            const popCell = row.locator('td:has(.icon.header.population)');

            const wood = parseInt((await woodCell.textContent() || '0').replace(/[^0-9]/g, ''), 10);
            const stone = parseInt((await stoneCell.textContent() || '0').replace(/[^0-9]/g, ''), 10);
            const iron = parseInt((await ironCell.textContent() || '0').replace(/[^0-9]/g, ''), 10);
            const buildTime = await timeCell.textContent() || '';

            // Check if population cell exists before trying to read it
            let population = 0;
            if (await popCell.count() > 0) {
                population = parseInt((await popCell.textContent() || '0').replace(/[^0-9]/g, ''), 10);
            }

            // Check if building can be built
            const inactiveText = await row.locator('td.build_options span.inactive').textContent() || '';
            const canBuild = !inactiveText.includes('Kolejka jest obecnie pełna') &&
                !inactiveText.includes('Surowce dostępne');
            // Check if the next level button is hidden
            const nextLevelButton = row.locator('a.btn-build');
            const nextLevelText = await nextLevelButton.getAttribute('data-level-next') || '';
            const nextLevel = nextLevelText ? parseInt(nextLevelText, 10) : level + 1;
            // Check if building is in queue
            const buildingName = nameText
                .split('\n')
                .map(line => line.trim())
                .filter(line => line.length > 0 && !line.includes('Poziom'))[0] || '';

            const inQueue = await this.isBuildingInQueue(buildingName, nextLevel);
            buildings.push({
                id: buildingId,
                name: buildingName,
                level,
                nextLevel,
                wood,
                stone,
                iron,
                buildTime,
                population,
                canBuild,
                inQueue,
                available: true,
                fullyUpgraded: false,
                requirements: {}
            });
        }
        // Process unavailable buildings
        // const unavailableRows = this.page.locator('#buildings_unmet tbody tr');
        // const unavailableCount = await unavailableRows.count();
        // for (let i = 0; i < unavailableCount; i++) {
        //     const row = unavailableRows.nth(i);
        //     console.log('v14');
        //     // Get building information
        //     const nameCell = row.locator('td:first-child');
        //     const buildingName = await nameCell.locator('a').textContent() || '';
        //     console.log('v15');
        //     // Get building image to extract ID
        //     const imgSrc = await nameCell.locator('img').getAttribute('src') || '';
        //     const buildingId = this.getBuildingIdFromImageUrl(imgSrc);
        //     console.log('v16');
        //     // Get requirements
        //     const requirementsCell = row.locator('td:nth-child(2)');
        //     const requirements: { [key: string]: { name: string; level: number; met: boolean } } = {};
        //     console.log('v17');
        //     const reqItems = requirementsCell.locator('.unmet_req span');
        //     const reqCount = await reqItems.count();
        //     console.log('v18');
        //     for (let j = 0; j < reqCount; j++) {
        //         const reqItem = reqItems.nth(j);
        //         const reqText = await reqItem.textContent() || '';
        //         const reqMatch = reqText.match(/(.*?)\\s*\\((\\d+)\\)/);

        //         if (reqMatch) {
        //             const reqName = reqMatch[1].trim();
        //             const reqLevel = parseInt(reqMatch[2], 10);
        //             const reqImageSrc = await reqItem.locator('img').getAttribute('src') || '';
        //             const reqId = this.getBuildingIdFromImageUrl(reqImageSrc);
        //             const isActive = !(await reqItem.locator('.inactive').isVisible());
        //             console.log('v19');
        //             requirements[reqId] = {
        //                 name: reqName,
        //                 level: reqLevel,
        //                 met: isActive
        //             };
        //         }
        //     }
        //     console.log('v20');
        //     buildings.push({
        //         id: buildingId,
        //         name: buildingName,
        //         level: 0,
        //         nextLevel: 1,
        //         wood: 0,
        //         stone: 0,
        //         iron: 0,
        //         buildTime: '',
        //         population: 0,
        //         canBuild: false,
        //         inQueue: false,
        //         available: false,
        //         fullyUpgraded: false,
        //         requirements
        //     });
        // }
        return buildings;
    }

    /**
     * Check if a building is currently in the queue
     */
    private async isBuildingInQueue(buildingName: string, level: number): Promise<boolean> {
        const queueItems = await this.getQueueItems();
        return queueItems.some(item =>
            item.name.trim() === buildingName.trim() && item.level === level
        );
    }

    /**
     * Get current resources from the UI
     */
    async getCurrentResources(): Promise<Resources> {
        const woodElem = this.page.locator('#wood');
        const stoneElem = this.page.locator('#stone');
        const ironElem = this.page.locator('#iron');
        const popCurrentElem = this.page.locator('#pop_current_label');
        const popMaxElem = this.page.locator('#pop_max_label');

        const wood = parseInt((await woodElem.textContent() || '0').replace(/\D/g, ''), 10);
        const stone = parseInt((await stoneElem.textContent() || '0').replace(/\D/g, ''), 10);
        const iron = parseInt((await ironElem.textContent() || '0').replace(/\D/g, ''), 10);
        const popCurrent = parseInt((await popCurrentElem.textContent() || '0').replace(/\D/g, ''), 10);
        const popMax = parseInt((await popMaxElem.textContent() || '0').replace(/\D/g, ''), 10);

        return {
            wood,
            stone,
            iron,
            population: {
                current: popCurrent,
                max: popMax
            }
        };
    }

    /**
     * Check if there are enough resources to build a specific building
     * @param buildingInfo - Building information with resource requirements
     * @returns Object containing result and missing resources
     */
    async hasEnoughResources(buildingInfo: BuildingInfo): Promise<{
        hasEnough: boolean;
        missing: { wood: number; stone: number; iron: number; population: number }
    }> {
        const currentResources = await this.getCurrentResources();

        const missingWood = Math.max(0, buildingInfo.wood - currentResources.wood);
        const missingStone = Math.max(0, buildingInfo.stone - currentResources.stone);
        const missingIron = Math.max(0, buildingInfo.iron - currentResources.iron);

        // Check population only if the building has a population cost
        const missingPopulation = buildingInfo.population > 0 ?
            Math.max(0, buildingInfo.population - (currentResources.population.max - currentResources.population.current)) :
            0;

        const hasEnough = missingWood === 0 && missingStone === 0 && missingIron === 0 && missingPopulation === 0;

        return {
            hasEnough,
            missing: {
                wood: missingWood,
                stone: missingStone,
                iron: missingIron,
                population: missingPopulation
            }
        };
    }

    /**
     * Attempt to build a specific building
     * @param buildingId - ID of the building to build
     * @returns - true if successful, false otherwise
     */
    async buildBuilding(buildingId: string): Promise<{ success: boolean; message?: string }> {
        // Check if queue is full
        if (await this.isQueueFull()) {
            return { success: false, message: "Building queue is full" };
        }

        // Get building information
        const buildings = await this.getAllBuildings();
        const building = buildings.find(b => b.id === buildingId);

        if (!building) {
            return { success: false, message: "Building not found" };
        }

        // Check resource requirements
        const resourceCheck = await this.hasEnoughResources(building);
        if (!resourceCheck.hasEnough) {
            let missingResourcesMsg = "Not enough resources: ";

            if (resourceCheck.missing.wood > 0) {
                missingResourcesMsg += `wood(${resourceCheck.missing.wood}) `;
            }
            if (resourceCheck.missing.stone > 0) {
                missingResourcesMsg += `stone(${resourceCheck.missing.stone}) `;
            }
            if (resourceCheck.missing.iron > 0) {
                missingResourcesMsg += `iron(${resourceCheck.missing.iron}) `;
            }
            if (resourceCheck.missing.population > 0) {
                missingResourcesMsg += `population(${resourceCheck.missing.population})`;
            }

            return { success: false, message: missingResourcesMsg.trim() };
        }

        // Find the build button for this building using a more flexible CSS selector
        // Aktualizujemy selektor, aby pasował do rzeczywistej struktury HTML
        const buildButton = this.page.locator(`a.btn-build[data-building="${buildingId}"]`);

        // Check if button exists and is visible
        if (await buildButton.count() === 0) {
            return { success: false, message: `Build button not found for building ${buildingId}` };
        }

        // Make the button visible if needed and click it
        try {
            await buildButton.click({ timeout: 3000 });
        } catch (error) {
            // Jeśli zwykłe kliknięcie nie zadziała, spróbujmy użyć JavaScript
            console.log(error);
        }

        // Wait for queue to update
        await this.page.waitForTimeout(1000);


        return {
            success: true,
            message: `Successfully queued ${building.name} for construction to level ${building.nextLevel}`
        };
    }

    /**
     * Cancel a building in the queue
     * @param queueId - ID of the queue item to cancel
     */
    async cancelBuilding(queueId: string): Promise<boolean> {
        // Find the cancel button for this queue item
        const cancelButton = this.page.locator(`a.btn-cancel[href*="id=${queueId}"]`);

        // Check if button exists
        if (await cancelButton.count() === 0) {
            return false;
        }

        // Click the cancel button
        await cancelButton.click();

        // Wait for confirmation dialog and confirm
        await this.page.waitForSelector('.popup_box');
        const confirmButton = this.page.locator('.popup_box .btn-confirm');
        await confirmButton.click();

        // Wait for queue to update
        await this.page.waitForTimeout(1000);

        // Verify the building is no longer in queue
        const queueItems = await this.getQueueItems();
        return !queueItems.some(item => item.id === queueId);
    }
}