import { Page } from 'playwright';
import { Logger } from '@nestjs/common';

// Interface for unit data
export interface UnitData {
    name: string;
    dataUnit: string;
    inVillage: number;
    total: number;
    canRecruit: number;
}

// Interface for army data
export interface ArmyData {
    villageId: string;
    serverCode: string;
    units: UnitData[];
    totalUnitsInVillage: number;
    totalUnitsOverall: number;
}

export class ArmyUtils {
    private static logger = new Logger(ArmyUtils.name);

    // URL template constants
    private static readonly TRAIN_URL_TEMPLATE = 'https://{serverCode}.plemiona.pl/game.php?village={villageId}&screen=train';

    /**
     * Pobiera dane o wojsku z wioski ze strony treningu jednostek
     * @param page - Instancja strony Playwright
     * @param villageId - ID wioski
     * @param serverCode - Kod serwera
     * @returns Promise z danymi o wojsku
     */
    static async getArmyData(page: Page, villageId: string, serverCode: string): Promise<ArmyData> {
        this.logger.log(`Getting army data for village ${villageId} on world ${serverCode}`);

        // Navigate to training page
        const trainingUrl = this.TRAIN_URL_TEMPLATE
            .replace('{serverCode}', serverCode)
            .replace('{villageId}', villageId);

        this.logger.log(`Navigating to training page: ${trainingUrl}`);

        await page.goto(trainingUrl, { waitUntil: 'networkidle', timeout: 15000 });

        // Parse army data from the training table
        const armyData = await this.parseArmyFromTrainingTable(page, villageId, serverCode);

        // Log collected data
        this.logArmyData(armyData);

        this.logger.log('Army data collection completed');
        return armyData;
    }

    /**
     * Parsuje dane o wojsku z tabeli treningu
     * @param page - Instancja strony Playwright
     * @param villageId - ID wioski
     * @param worldNumber - Numer świata
     * @returns Promise z danymi o wojsku
     */
    private static async parseArmyFromTrainingTable(page: Page, villageId: string, serverCode: string): Promise<ArmyData> {
        const units: UnitData[] = [];

        try {
            // Find the training form table
            const trainingTable = page.locator('#train_form table.vis');
            if (!(await trainingTable.isVisible({ timeout: 5000 }))) {
                this.logger.warn('Training table not found or not visible');
                return {
                    villageId,
                    serverCode,
                    units: [],
                    totalUnitsInVillage: 0,
                    totalUnitsOverall: 0
                };
            }

            // Get all unit rows (excluding header and footer)
            const unitRows = await trainingTable.locator('tbody tr').all();

            for (const row of unitRows) {
                try {
                    // Check if this row contains a unit (has unit_link)
                    const unitLink = row.locator('a.unit_link[data-unit]');

                    if (!(await unitLink.isVisible({ timeout: 1000 }))) {
                        // Skip non-unit rows (header, footer, etc.)
                        continue;
                    }

                    // Extract unit data
                    const dataUnit = await unitLink.getAttribute('data-unit');
                    const unitName = await unitLink.textContent();

                    if (!dataUnit || !unitName) {
                        this.logger.warn('Could not extract unit data or name from row');
                        continue;
                    }

                    // Extract unit counts from "W wiosce/ogólnie" column (3rd column)
                    const countCell = row.locator('td').nth(2);
                    const countText = await countCell.textContent();

                    if (!countText) {
                        this.logger.warn(`Could not extract count text for unit ${dataUnit}`);
                        continue;
                    }

                    // Parse format like "6/22" - inVillage/total
                    const countMatch = countText.trim().match(/^(\d+)\/(\d+)$/);

                    if (!countMatch) {
                        this.logger.warn(`Could not parse count format for unit ${dataUnit}: "${countText}"`);
                        continue;
                    }

                    const inVillage = parseInt(countMatch[1], 10);
                    const total = parseInt(countMatch[2], 10);

                    // Extract recruitment capacity from the link text like "(10)"
                    let canRecruit = 0;
                    try {
                        const recruitLink = row.locator('a[href*="set_max"]');
                        if (await recruitLink.isVisible({ timeout: 1000 })) {
                            const recruitText = await recruitLink.textContent();
                            const recruitMatch = recruitText?.match(/\((\d+)\)/);
                            if (recruitMatch) {
                                canRecruit = parseInt(recruitMatch[1], 10);
                            }
                        }
                    } catch (recruitError) {
                        this.logger.debug(`Could not extract recruitment capacity for ${dataUnit}: ${recruitError.message}`);
                    }

                    units.push({
                        name: unitName.trim(),
                        dataUnit,
                        inVillage,
                        total,
                        canRecruit
                    });

                    this.logger.debug(`Parsed unit: ${dataUnit} - ${unitName.trim()} (${inVillage}/${total}, can recruit: ${canRecruit})`);

                } catch (rowError) {
                    this.logger.warn(`Error parsing unit row: ${rowError.message}`);
                    continue;
                }
            }

        } catch (error) {
            this.logger.error('Error parsing army data from training table:', error);
        }

        // Calculate totals
        const totalUnitsInVillage = units.reduce((sum, unit) => sum + unit.inVillage, 0);
        const totalUnitsOverall = units.reduce((sum, unit) => sum + unit.total, 0);

        return {
            villageId,
            serverCode,
            units,
            totalUnitsInVillage,
            totalUnitsOverall
        };
    }

    /**
     * Loguje zebrane dane o wojsku
     * @param armyData - Dane o wojsku do wylogowania
     */
    private static logArmyData(armyData: ArmyData): void {
        this.logger.log('=== ARMY DATA ===');
        this.logger.log(`Village: ${armyData.villageId} (Server: ${armyData.serverCode})`);
        this.logger.log(`Total units in village: ${armyData.totalUnitsInVillage}`);
        this.logger.log(`Total units overall: ${armyData.totalUnitsOverall}`);
        this.logger.log('--- Unit Details ---');

        for (const unit of armyData.units) {
            this.logger.log(`${unit.name} (${unit.dataUnit}): ${unit.inVillage}/${unit.total} (can recruit: ${unit.canRecruit})`);
        }

        if (armyData.units.length === 0) {
            this.logger.log('No units found or training building not available');
        }

        this.logger.log('==================');
    }

    static async startTrainingLight(page: Page, villageId: string, serverCode: string, light: UnitData, maxRecruitment: number) {
        const trainingUrl = this.TRAIN_URL_TEMPLATE
            .replace('{serverCode}', serverCode)
            .replace('{villageId}', villageId);

        await page.goto(trainingUrl, { waitUntil: 'networkidle', timeout: 15000 });
        const trainingForm = page.locator('#train_form');
        const input = trainingForm.locator(`input[name="${light.dataUnit}"]`);
        await input.fill(maxRecruitment.toString());

        const submitButton = trainingForm.locator('input[class="btn btn-recruit"]');
        await submitButton.click();
        return {
            success: true,
        }
    }
} 