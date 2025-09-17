import { BarbarianVillage, LastAttackCheckResult } from "@/utils/army/attack.utils";
import { Logger } from "@nestjs/common";
import { Page } from "playwright";

export interface VillageInfoData {
    coordinateX: number;
    coordinateY: number;
    points: number;
    owner: string;
    ownerId: string;
    tribe?: string;
}

export class VillageInfoPage {
    private readonly logger = new Logger(VillageInfoPage.name);
    private readonly page: Page;
    private readonly baseUrl: string;
    private readonly serverCode: string;

    constructor(page: Page, serverCode: string) {
        this.page = page;
        this.baseUrl = `https://${serverCode}.plemiona.pl`;
        this.serverCode = serverCode;
    }

    /**
    * Navigate to the village info page
    *  example  https://pl219.plemiona.pl/game.php?village=12208&screen=info_village&id=12276#387;506
    */
    public async navigateToVillageInfo(villageId: string, targetId: string) {

        await this.page.goto(`${this.baseUrl}/game.php?village=${villageId}&screen=info_village&id=${targetId}`);
    }


    public async getValueElementByKey(keyText: string) {
        return await this.page.evaluate((keyText) => {
            // Znajdź wszystkie komórki w pierwszej kolumnie tabeli
            const keyCells = document.querySelectorAll("table.vis td:first-child");

            // Przejdź przez komórki, aby znaleźć tę z szukanym tekstem
            for (const cell of keyCells) {
                if (cell.textContent?.trim() === keyText) {
                    // Zwróć następny element w tym samym wierszu (czyli drugą komórkę)
                    return cell.nextElementSibling;
                }
            }

            return null; // Zwróć null, jeśli nic nie znaleziono
        }, keyText);
    }

    public async getVillageData(): Promise<VillageInfoData> {
        this.logger.log(`Getting village data for server ${this.serverCode}`);
        const villageData: VillageInfoData = await this.page.evaluate(() => {
            function getValueElementByKey(keyText: string): Element | null {
                const keyCells = document.querySelectorAll("table.vis td:first-child");
                for (const cell of keyCells) {
                    if (cell.textContent?.trim() === keyText) {
                        return cell.nextElementSibling;
                    }
                }
                return null;
            }

            const coordinatesCell = getValueElementByKey("Współrzędne:");
            const pointsCell = getValueElementByKey("Punkty:");
            const playerCell = getValueElementByKey("Gracz:");
            const tribeCell = getValueElementByKey("Plemię:");

            const coordinates = coordinatesCell?.textContent?.trim() || '';
            const points = pointsCell?.textContent?.trim() || '0';
            const playerLink = playerCell?.querySelector("a");
            const tribeLink = tribeCell?.querySelector("a");

            const [x, y] = coordinates.split('|').map(coord => parseInt(coord.trim()));

            return {
                coordinateX: x || 0,
                coordinateY: y || 0,
                points: parseInt(points) || 0,
                owner: playerLink?.textContent?.trim() || '',
                ownerId: playerLink?.getAttribute('href')?.match(/id=(\d+)/)?.[1] || '',
                tribe: tribeLink?.textContent?.trim() || undefined,
            };
        });

        return villageData;
    }

    /**
  * Sprawdza czy można atakować wioskę na podstawie ostatniego ataku
  * @param page Instancja strony Playwright
  * @param targetVillage Wioska do sprawdzenia
  * @param sourceVillageId ID wioski źródłowej
  * @param serverCode Kod serwera (np. 'pl217')
  * @returns Wynik sprawdzenia czy można atakować
  */
    public async checkLastAttackResult(
        page: Page,
        targetVillage: BarbarianVillage,
        sourceVillageId: string,
        serverCode: string
    ): Promise<LastAttackCheckResult> {
        this.logger.log(`🔍 Checking last attack result for ${targetVillage.name} (${targetVillage.coordinateX}|${targetVillage.coordinateY})`);

        try {
            // Skonstruuj URL informacji o wiosce
            const infoUrl = `https://${serverCode}.plemiona.pl/game.php?village=${sourceVillageId}&screen=info_village&id=${targetVillage.target}`;
            this.logger.debug(`Info URL: ${infoUrl}`);

            // Nawiguj do strony informacji o wiosce
            this.logger.debug('Navigating to village info page...');
            await page.goto(infoUrl, { waitUntil: 'networkidle', timeout: 10000 });

            // Sprawdź czy istnieje forma z raportami (form z id 'report_table')
            const reportTableExists = await page.locator('#report_table').isVisible({ timeout: 5000 });

            if (!reportTableExists) {
                this.logger.log(`✅ No report table found - village can be attacked: ${targetVillage.name}`);
                return {
                    canAttack: true,
                    reason: 'No report table found',
                    hasReportTable: false
                };
            }

            this.logger.debug('Report table found, checking last attack result...');

            // Znajdź pierwszy wiersz z danymi (najnowszy atak)
            const firstDataRow = page.locator('#report_table table.vis tbody tr').nth(1); // nth(0) to header, nth(1) to pierwszy wiersz danych

            if (await firstDataRow.isVisible({ timeout: 5000 })) {
                // Sprawdź czy w pierwszym wierszu jest element z data-title="Pełna wygrana"
                const winIcon = firstDataRow.locator('img[data-title="Pełna wygrana"]');
                const hasWinIcon = await winIcon.isVisible({ timeout: 2000 });

                if (hasWinIcon) {
                    this.logger.log(`✅ Last attack was successful - village can be attacked: ${targetVillage.name}`);
                    return {
                        canAttack: true,
                        reason: 'Last attack was successful',
                        hasReportTable: true,
                        lastAttackWasWin: true
                    };
                } else {
                    this.logger.log(`❌ Last attack was not successful - village should not be attacked: ${targetVillage.name}`);
                    return {
                        canAttack: false,
                        reason: 'Last attack was not successful',
                        hasReportTable: true,
                        lastAttackWasWin: false
                    };
                }
            } else {
                this.logger.log(`✅ No data rows found in report table - village can be attacked: ${targetVillage.name}`);
                return {
                    canAttack: true,
                    reason: 'No data rows found in report table',
                    hasReportTable: true
                };
            }

        } catch (error) {
            this.logger.error(`Error checking last attack result for ${targetVillage.name}:`, error);

            // W przypadku błędu, pozwalamy atakować (zachowawcze podejście)
            return {
                canAttack: true,
                reason: `Error during check: ${error.message}`,
                hasReportTable: undefined
            };
        }
    }
}
