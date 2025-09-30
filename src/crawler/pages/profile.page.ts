import { Page } from 'playwright';
import { Logger } from '@nestjs/common';

// Stała Player ID
export const PLAYER_ID = '699855525';

export interface BasicVillageData {
    id: string;
    name: string;
    coordinates: string;
    points: number;
}

export interface VillageCollectionResult {
    success: boolean;
    data: BasicVillageData[];
    villagesProcessed: number;
    errors: Array<{ villageName: string; error: string }>;
}

export class ProfilePage {
    private static readonly logger = new Logger(ProfilePage.name);

    /**
     * Pobiera podstawowe informacje o wioskach z profilu gracza (działa bez premium)
     * @param page - Playwright page instance
     * @param serverCode - Kod serwera (np. 'pl217')
     * @param options - Opcje konfiguracyjne
     * @returns Promise z danymi wiosek
     */
    static async collectVillageInformationFromProfile(
        page: Page,
        serverCode: string,
        options?: { timeoutPerPage?: number }
    ): Promise<VillageCollectionResult> {
        const { timeoutPerPage = 15000 } = options || {};

        this.logger.log('Starting village information collection from profile page...');

        const result: VillageCollectionResult = {
            success: false,
            data: [],
            villagesProcessed: 0,
            errors: []
        };

        try {
            // Nawigacja do strony profilu gracza (URL dynamiczny na podstawie serwera)
            const profileUrl = `https://${serverCode}.plemiona.pl/game.php?screen=info_player&id=${PLAYER_ID}`;
            this.logger.log(`Navigating to profile page: ${profileUrl}`);

            await page.goto(profileUrl, {
                waitUntil: 'networkidle',
                timeout: timeoutPerPage
            });

            // Sprawdź czy tabela z wioskami istnieje
            const villagesTable = page.locator('#villages_list');
            const isTableVisible = await villagesTable.isVisible({ timeout: 5000 });

            if (!isTableVisible) {
                const error = 'Villages table (#villages_list) not found on profile page';
                this.logger.error(error);
                result.errors.push({ villageName: 'N/A', error });
                return result;
            }

            this.logger.log('Villages table found, extracting data...');

            // Pobierz wszystkie wiersze z danymi wiosek (pomiń header)
            const villageRows = page.locator('#villages_list > tbody > tr');
            const rowCount = await villageRows.count();
            console.log("villageRows");
            console.log(villageRows);


            this.logger.log(`Found ${rowCount} village rows to process`);

            for (let i = 0; i < rowCount; i++) {
                try {
                    const row = villageRows.nth(i);

                    // Pobierz ID i nazwę wioski z zagnieżdżonej tabeli w pierwszej kolumnie
                    const villageSpan = row.locator('.village_anchor[data-id]');
                    const villageId = await villageSpan.getAttribute('data-id');

                    if (!villageId) {
                        this.logger.warn(`Village ID not found in row ${i}`);
                        continue;
                    }

                    // Pobierz nazwę wioski z linku w zagnieżdżonej tabeli
                    const villageLink = villageSpan.locator('a').first();
                    const villageNameRaw = await villageLink.textContent();
                    const villageName = villageNameRaw?.trim() || '';

                    if (!villageName) {
                        this.logger.warn(`Village name not found for ID ${villageId}`);
                        continue;
                    }

                    // Znajdź komórkę ze współrzędnymi dynamicznie (dopasowanie do wzorca x|y)
                    const cells = row.locator(':scope > td');
                    const cellCount = await cells.count();
                    let coordinates: string | null = null;
                    let coordinatesIndex: number = -1;
                    for (let c = 0; c < cellCount; c++) {
                        const raw = (await cells.nth(c).textContent()) ?? '';
                        const text = raw.replace(/\s+/g, ' ').replace(/\u00A0/g, ' ').trim();
                        if (/^\d+\|\d+$/.test(text)) {
                            coordinates = text;
                            coordinatesIndex = c;
                            break;
                        }
                    }
                    if (!coordinates) {
                        this.logger.warn(`Coordinates cell not found for village ${villageName}`);
                        continue;
                    }

                    // Znajdź komórkę z punktami: pierwsza liczba całkowita po kolumnie współrzędnych
                    let points = 0;
                    for (let c = coordinatesIndex + 1; c < cellCount; c++) {
                        const raw = (await cells.nth(c).textContent()) ?? '';
                        const normalized = raw
                            .replace(/\./g, '')
                            .replace(/\s+/g, '')
                            .replace(/\u00A0/g, '')
                            .trim();
                        if (/^\d+$/.test(normalized)) {
                            points = parseInt(normalized, 10);
                            break;
                        }
                    }

                    const villageData: BasicVillageData = {
                        id: villageId,
                        name: villageName,
                        coordinates: coordinates,
                        points
                    };

                    result.data.push(villageData);
                    result.villagesProcessed++;

                    this.logger.debug(`Processed village: ${villageName} (${villageId}) at ${coordinates} with ${points} points`);

                } catch (error) {
                    const errorMsg = `Error processing village row ${i}: ${error.message}`;
                    this.logger.error(errorMsg);
                    result.errors.push({ villageName: `Row ${i}`, error: errorMsg });
                }
            }

            result.success = result.data.length > 0;
            this.logger.log(`Village collection completed. Processed: ${result.villagesProcessed}, Errors: ${result.errors.length}`);

            return result;

        } catch (error) {
            const errorMsg = `Failed to collect village information from profile: ${error.message}`;
            this.logger.error(errorMsg);
            result.errors.push({ villageName: 'N/A', error: errorMsg });
            return result;
        }
    }
}
