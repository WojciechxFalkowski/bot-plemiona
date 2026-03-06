import { Page, Locator } from 'playwright';

export interface AccountManagerScrapeResult {
    executionTimeMs: number;
    villages: ScrapedVillageStatus[];
}

export type VillageClassification = 'ofensywna' | 'defensywna' | 'defensywna mobilna' | '';

export interface ScrapedVillageStatus {
    villageId: number;
    villageName: string;
    isBuilding: boolean;
    isRecruiting: boolean;
    farmSpace: {
        available: number;
        maxLevel: number;
    };
    units: Record<string, number>;
    armyTemplateName: VillageClassification;
}

export class AccountManagerCombinedPage {
    private readonly page: Page;
    private readonly combinedTable: Locator;

    constructor(page: Page) {
        this.page = page;
        this.combinedTable = page.locator('#combined_table');
    }

    /**
     * Navigates to the combined overview page
     */
    async navigate(serverCode: string, firstVillageId: string): Promise<void> {
        const url = `https://${serverCode}.plemiona.pl/game.php?village=${firstVillageId}&screen=overview_villages&mode=combined`;
        await this.page.goto(url, { waitUntil: 'networkidle' });

        // Wait for the combined table to appear, or finish if not found
        try {
            await this.page.waitForSelector('#combined_table', { timeout: 10000 });
        } catch (e) {
            // It's possible the Account Manager is not active or user has no premium
            console.warn('Combined table not found. Account Manager might not be active.');
        }
    }

    /**
     * Checks if the combined table is visible on the page
     */
    async isTableVisible(): Promise<boolean> {
        return await this.combinedTable.isVisible();
    }

    /**
     * Extracts data from the combined overview table
     */
    async extractCombinedData(): Promise<ScrapedVillageStatus[]> {
        if (!(await this.isTableVisible())) {
            return [];
        }

        const villages: ScrapedVillageStatus[] = [];

        // Map column indices dynamically
        const headerCells = await this.combinedTable.locator('thead tr th, tbody tr:first-child th').all();
        const columnMap = new Map<string, number>();

        // Dynamic columns to identify
        const targets = ['Ratusz', 'Koszary', 'Stajnia', 'Zagroda'];
        const unitNames: string[] = []; // Collect discovered unit names

        for (let i = 0; i < headerCells.length; i++) {
            const cell = headerCells[i];

            // Check text content first
            let textContent = await cell.textContent();
            textContent = textContent ? textContent.trim() : '';

            // Some headers have images with data-title instead of text
            const imgLocator = cell.locator('img[data-title]').first();
            if (await imgLocator.count() > 0) {
                const dataTitle = await imgLocator.getAttribute('data-title');
                if (dataTitle) {
                    if (targets.includes(dataTitle)) {
                        columnMap.set(dataTitle, i);
                    } else if (await imgLocator.getAttribute('src') && (await imgLocator.getAttribute('src'))?.includes('/unit/')) {
                        // It's a unit column!
                        columnMap.set(dataTitle, i);
                        unitNames.push(dataTitle);
                    }
                }
            } else if (textContent) {
                // Not using text based headers right now per design, but could be useful
                if (textContent.includes('Wioska')) {
                    columnMap.set('Wioska', i);
                }
            }
        }

        // Now process each row
        const rows = await this.combinedTable.locator('tbody tr.nowrap').all();

        for (const row of rows) {
            try {
                const villageData = await this.extractSingleRow(row, columnMap, unitNames);
                if (villageData) {
                    villages.push(villageData);
                }
            } catch (e) {
                console.warn('Failed to parse a row in combined table', e);
            }
        }

        return villages;
    }

    private async extractSingleRow(
        row: Locator,
        columnMap: Map<string, number>,
        unitNames: string[]
    ): Promise<ScrapedVillageStatus | null> {
        const cells = await row.locator('td').all();
        if (cells.length < columnMap.size - 2) {
            return null; // Invalid row
        }

        // 1. Village ID and Name
        const vnElement = row.locator('.quickedit-vn').first();
        const villageIdStr = await vnElement.getAttribute('data-id');
        if (!villageIdStr) return null;
        const villageId = parseInt(villageIdStr, 10);

        const labelElement = vnElement.locator('.quickedit-label').first();
        const villageNameRaw = await labelElement.textContent() || '';
        // Regex to match "Name (549|582) K55" and extract just the name? We will just keep the raw text.
        const villageName = villageNameRaw.trim();

        // 2. Building Status
        let isBuilding = false;
        const ratuszIndex = columnMap.get('Ratusz');
        if (ratuszIndex !== undefined && cells[ratuszIndex]) {
            const cell = cells[ratuszIndex];
            const statusIcon = cell.locator('img.status-icon').first();
            if (await statusIcon.count() > 0) {
                const src = await statusIcon.getAttribute('src');
                if (src && src.includes('prod_running')) {
                    isBuilding = true;
                }
            }
        }

        // 3. Recruiting Status
        let isRecruiting = false;
        const koszaryIndex = columnMap.get('Koszary');
        const stajniaIndex = columnMap.get('Stajnia');

        for (const index of [koszaryIndex, stajniaIndex]) {
            if (index !== undefined && cells[index]) {
                const cell = cells[index];
                const statusIcon = cell.locator('img.status-icon').first();
                if (await statusIcon.count() > 0) {
                    const src = await statusIcon.getAttribute('src');
                    if (src && src.includes('prod_running')) {
                        isRecruiting = true;
                    }
                }
            }
        }

        // 4. Farm Space
        let farmSpace = { available: 0, maxLevel: 0 };
        const zagrodaIndex = columnMap.get('Zagroda');
        if (zagrodaIndex !== undefined && cells[zagrodaIndex]) {
            const cell = cells[zagrodaIndex];
            const text = await cell.textContent() || '';
            // Format is often "20448 (30)" or "24000 (30)" etc
            const match = text.trim().match(/^(\d+)[^\d]+(\d+)/);
            if (match) {
                farmSpace.available = parseInt(match[1], 10);
                farmSpace.maxLevel = parseInt(match[2], 10);
            } else {
                // Backup parse if they are just raw numbers
                const parsed = parseInt(text.replace(/\D/g, ''), 10);
                if (!isNaN(parsed)) {
                    farmSpace.available = parsed;
                }
            }
        }

        // 5. Units
        const units: Record<string, number> = {};
        for (const unitName of unitNames) {
            const unitIndex = columnMap.get(unitName);
            if (unitIndex !== undefined && cells[unitIndex]) {
                const cell = cells[unitIndex];
                const text = await cell.textContent() || '';
                const count = parseInt(text.replace(/\./g, ''), 10); // remove dot separators thousands
                units[unitName] = isNaN(count) ? 0 : count;
            }
        }

        return {
            villageId,
            villageName,
            isBuilding,
            isRecruiting,
            farmSpace,
            units,
            armyTemplateName: ''
        };
    }
}
