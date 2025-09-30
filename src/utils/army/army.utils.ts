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

    /**
     * Wypełnia formularz treningu na już otwartej stronie budynku "train" i wysyła żądanie rekrutacji
     * Nie wykonuje nawigacji ani dodatkowych walidacji pojemności – zakłada, że logika wyżej to sprawdziła
     */
    static async startTrainingUnitOnTrainPage(page: Page, unitNameKey: string, amount: number) {
        const trainingForm = page.locator('#train_form');
        if (!(await trainingForm.isVisible({ timeout: 5000 }))) {
            this.logger.warn('Training form not visible on page');
            return { success: false, error: 'Training form not visible' };
        }

        const input = trainingForm.locator(`input[name="${unitNameKey}"]`);
        if (!(await input.isVisible({ timeout: 2000 }))) {
            this.logger.warn(`Input for unit ${unitNameKey} not found`);
            return { success: false, error: `Input for unit ${unitNameKey} not found` };
        }

        await input.fill(amount.toString());

        const submitButton = trainingForm.locator('input.btn.btn-recruit');
        if (!(await submitButton.isVisible({ timeout: 2000 }))) {
            this.logger.warn('Recruit submit button not found');
            return { success: false, error: 'Recruit submit button not found' };
        }

        await submitButton.click();
        this.logger.log(`Submitted recruitment for ${amount} of ${unitNameKey}`);
        return { success: true, recruitedAmount: amount };
    }

    static async startTrainingLight(page: Page, villageId: string, serverCode: string, lightNameKey: string, maxRecruitment: number) {
        const trainingUrl = this.TRAIN_URL_TEMPLATE
            .replace('{serverCode}', serverCode)
            .replace('{villageId}', villageId);

        await page.goto(trainingUrl, { waitUntil: 'networkidle', timeout: 15000 });
        const trainingForm = page.locator('#train_form');
        const input = trainingForm.locator(`input[name="${lightNameKey}"]`);

        // Pobierz dostępną liczbę jednostek do rekrutacji
        const availableRecruitment = await trainingForm.locator(`a[id="light_0_a"]`).textContent();
        const availableRecruitmentNumber = availableRecruitment?.match(/\((\d+)\)/)?.[1];

        if (!availableRecruitmentNumber) {
            this.logger.warn(`Could not extract available recruitment number for village ${villageId} on server ${serverCode}`);
            return {
                success: false,
                error: 'Could not extract available recruitment number'
            };
        }

        const availableNumber = parseInt(availableRecruitmentNumber, 10);

        // Sprawdź dostępną liczbę rekrutacji i zaloguj odpowiedni komunikat
        if (availableNumber < maxRecruitment) {
            this.logger.warn(`Insufficient recruitment capacity for village ${villageId} on server ${serverCode}. Available: ${availableNumber}, Requested: ${maxRecruitment}. Cannot recruit requested amount.`);
            return {
                success: false,
                error: 'Insufficient recruitment capacity',
                availableCapacity: availableNumber,
                requestedAmount: maxRecruitment
            };
        } else {
            this.logger.log(`Recruitment capacity sufficient for village ${villageId} on server ${serverCode}. Available: ${availableNumber}, Requested: ${maxRecruitment}.`);
        }

        // Sprawdź czy w ogóle można coś zrekrutować
        if (availableNumber === 0) {
            this.logger.warn(`No recruitment capacity available for village ${villageId} on server ${serverCode}. Cannot recruit any units.`);
            return {
                success: false,
                error: 'No recruitment capacity available'
            };
        }

        await input.fill(maxRecruitment.toString());

        const submitButton = trainingForm.locator('input[class="btn btn-recruit"]');
        await submitButton.click();

        this.logger.log(`Successfully started training ${maxRecruitment} light units for village ${villageId} on server ${serverCode}`);

        return {
            success: true,
            recruitedAmount: maxRecruitment,
            availableCapacity: availableNumber
        };
    }
} 