import { Page, Locator } from 'playwright';

export class UnitsOverviewPage {
    private readonly page: Page;
    private readonly unitsTable: Locator;

    constructor(page: Page) {
        this.page = page;
        this.unitsTable = page.locator('#units_table');
    }

    /**
     * Navigates to the units overview page (complete type)
     */
    async navigate(serverCode: string, firstVillageId: string): Promise<void> {
        const url = `https://${serverCode}.plemiona.pl/game.php?village=${firstVillageId}&screen=overview_villages&mode=units&type=complete`;
        await this.page.goto(url, { waitUntil: 'networkidle' });

        // Wait for the units table to appear
        try {
            await this.page.waitForSelector('#units_table', { timeout: 10000 });
        } catch (e) {
            console.warn('Units table not found on units overview page.');
        }
    }

    /**
     * Extracts total ("razem") units for each village from the units overview table.
     * Returns a Map of villageId -> Record<unitName, count>
     */
    async extractUnitsData(): Promise<Map<number, Record<string, number>>> {
        const result = new Map<number, Record<string, number>>();
        if (!(await this.unitsTable.isVisible())) {
            return result;
        }

        // Map column indices dynamically based on header unit images
        const headerCells = await this.unitsTable.locator('thead tr th').all();
        const unitNames: string[] = [];

        for (const cell of headerCells) {
            const imgLocator = cell.locator('img[data-title]').first();
            if (await imgLocator.count() > 0) {
                const src = await imgLocator.getAttribute('src');
                if (src && src.includes('/unit/')) {
                    const dataTitle = await imgLocator.getAttribute('data-title');
                    if (dataTitle) {
                        unitNames.push(dataTitle);
                    }
                }
            }
        }

        // Each village has its own tbody
        const tbodies = await this.unitsTable.locator('tbody').all();

        for (const tbody of tbodies) {
            // Find village ID
            const vnElement = tbody.locator('.quickedit-vn').first();
            if (await vnElement.count() === 0) continue;

            const villageIdStr = await vnElement.getAttribute('data-id');
            if (!villageIdStr) continue;
            const villageId = parseInt(villageIdStr, 10);

            // Find the row containing total units ("razem")
            const razemRow = tbody.locator('tr').filter({ hasText: 'razem' }).first();
            if (await razemRow.count() === 0) continue;

            // Extract units based on mapped columns
            const unitCells = await razemRow.locator('td.unit-item').all();
            const units: Record<string, number> = {};

            for (let i = 0; i < unitNames.length && i < unitCells.length; i++) {
                const text = await unitCells[i].textContent() || '';
                const count = parseInt(text.replace(/\./g, '').trim(), 10);
                units[unitNames[i]] = isNaN(count) ? 0 : count;
            }

            result.set(villageId, units);
        }

        return result;
    }
}
