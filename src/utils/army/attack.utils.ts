import { Logger } from '@nestjs/common';
import { Page } from 'playwright';
import { promises as fs } from 'fs';
import { join } from 'path';
import { ArmyData, UnitData } from './army.utils';

// Interfejs dla wioski barbarzyńskiej
export interface BarbarianVillage {
    target: string; // Primary key - unique village target ID
    name: string;
    coordinateX: number;
    coordinateY: number;
    canAttack: boolean;
    createdAt: Date;
    updatedAt: Date;
}

// Interfejs dla wioski gracza
export interface PlayerVillage {
    id: number;
    target: string;
    serverId: number;
    villageId: string;
    name: string;
    coordinateX: number;
    coordinateY: number;
    owner: string;
    ownerId?: string;
    tribe?: string;
    tribeId?: string;
    points: number;
    population: number;
    canAttack: boolean;
    lastVerified?: Date;
    createdAt: Date;
    updatedAt: Date;
}

// Interfejs dla strategii ataku na wioski graczy
export interface PlayerVillageAttackStrategy {
    id: number;
    serverId: number;
    villageId: string;
    spear: number;
    sword: number;
    axe: number;
    archer: number;
    spy: number;
    light: number;
    marcher: number;
    heavy: number;
    ram: number;
    catapult: number;
    knight: number;
    snob: number;
    createdAt: Date;
    updatedAt: Date;
}

// Interfejs dla wyniku obliczenia dostępnych ataków
export interface AttackCalculationResult {
    maxAttacks: number;
    availableLight: number;
    lightPerAttack: number;
}

// Interfejs dla wyniku obliczenia dostępnych ataków z pikami i mieczami
export interface AttackCalculationResultSpearSword {
    maxAttacks: number;
    availableSpear: number;
    availableSword: number;
    spearPerAttack: number;
    swordPerAttack: number;
}

// Interfejs dla wyniku weryfikacji właściciela wioski
export interface VillageOwnerVerification {
    isValid: boolean;
    owner: string;
    error?: string;
}

// Interfejs dla wyniku weryfikacji właściciela wioski gracza
export interface PlayerVillageOwnerVerification {
    isValid: boolean;
    owner: string;
    ownerId?: string;
    tribe?: string;
    tribeId?: string;
    points: number;
    population: number;
    error?: string;
}

// Interfejs dla wyniku ataku
export interface AttackResult {
    success: boolean;
    targetVillage: BarbarianVillage;
    error?: string;
    attackUrl?: string;
}

// Interfejs dla wyniku ataku na wioski graczy
export interface PlayerVillageAttackResult {
    success: boolean;
    targetVillage: PlayerVillage;
    error?: string;
    attackUrl?: string;
}

// Interfejs dla wyniku sprawdzenia ostatniego ataku
export interface LastAttackCheckResult {
    canAttack: boolean;
    reason: string;
    lastAttackWasWin?: boolean;
    hasReportTable?: boolean;
}

export const ERROR_MESSAGE_ATTACK_BUTTON_NOT_FOUND = 'Attack button not found or not visible';
export const ERROR_MESSAGE_ATTACK_FORM_NOT_FOUND = 'Attack form not found on page';

export class AttackUtils {
    private static readonly logger = new Logger(AttackUtils.name);

    // Stałe dla mini ataków z lekką kawalerią
    private static readonly LIGHT_PER_ATTACK = 2;

    // Stałe dla mini ataków z pikami i mieczami
    private static readonly SPEAR_PER_ATTACK = 2;
    private static readonly SWORD_PER_ATTACK = 2;

    private static readonly SOURCE_VILLAGE_ID = '2197';


    /**
     * Ładuje listę wiosek barbarzyńskich z pliku JSON
     * @returns Lista wiosek barbarzyńskich
     */
    public static async loadBarbarianVillages(): Promise<BarbarianVillage[]> {
        try {
            this.logger.debug('Loading barbarian villages from JSON file...');

            const filePath = join(process.cwd(), 'src', 'crawler', 'barbarian-villages.json');
            const fileContent = await fs.readFile(filePath, 'utf-8');
            const villages: BarbarianVillage[] = JSON.parse(fileContent);

            this.logger.log(`Successfully loaded ${villages.length} barbarian villages from JSON`);
            return villages;

        } catch (error) {
            this.logger.error('Error loading barbarian villages:', error);
            throw new Error(`Failed to load barbarian villages: ${error.message}`);
        }
    }

    /**
     * Oblicza ile ataków można wykonać na podstawie dostępnego wojska
     * @param armyData Dane o dostępnym wojsku
     * @returns Wynik obliczeń z liczbą możliwych ataków
     */
    public static calculateAvailableAttacks(armyData: ArmyData): AttackCalculationResult {
        this.logger.debug('Calculating available attacks based on army data...');

        // Znajdź dane o lekkiej kawalerii
        const lightUnit = armyData.units.find(unit => unit.dataUnit === 'light');

        const availableLight = lightUnit?.inVillage || 0;

        // Oblicz ile ataków można wykonać (każdy atak wymaga 2 jednostki lekkiej kawalerii)
        const maxAttacks = Math.floor(availableLight / this.LIGHT_PER_ATTACK);

        const result: AttackCalculationResult = {
            maxAttacks,
            availableLight,
            lightPerAttack: this.LIGHT_PER_ATTACK
        };

        this.logger.log(`Attack calculation: ${availableLight} light cavalry → ${maxAttacks} possible attacks`);
        this.logger.debug(`  - Max attacks from light cavalry: ${maxAttacks} (${availableLight}/${this.LIGHT_PER_ATTACK})`);

        return result;
    }

    /**
     * Oblicza ile ataków można wykonać na podstawie dostępnego wojska (piki i miecze)
     * @param armyData Dane o dostępnym wojsku
     * @returns Wynik obliczeń z liczbą możliwych ataków z pikami i mieczami
     */
    public static calculateAvailableAttacksSpearSword(armyData: ArmyData): AttackCalculationResultSpearSword {
        this.logger.debug('Calculating available attacks based on army data (spear & sword)...');

        // Znajdź dane o spear i sword
        const spearUnit = armyData.units.find(unit => unit.dataUnit === 'spear');
        const swordUnit = armyData.units.find(unit => unit.dataUnit === 'sword');

        const availableSpear = spearUnit?.inVillage || 0;
        const availableSword = swordUnit?.inVillage || 0;

        // Oblicz ile ataków można wykonać (każdy atak wymaga 2 spear + 2 sword)
        const maxAttacksFromSpear = Math.floor(availableSpear / this.SPEAR_PER_ATTACK);
        const maxAttacksFromSword = Math.floor(availableSword / this.SWORD_PER_ATTACK);
        const maxAttacks = Math.min(maxAttacksFromSpear, maxAttacksFromSword);

        const result: AttackCalculationResultSpearSword = {
            maxAttacks,
            availableSpear,
            availableSword,
            spearPerAttack: this.SPEAR_PER_ATTACK,
            swordPerAttack: this.SWORD_PER_ATTACK
        };

        this.logger.log(`Attack calculation: ${availableSpear} spear, ${availableSword} sword → ${maxAttacks} possible attacks`);
        this.logger.debug(`  - Max attacks from spear: ${maxAttacksFromSpear} (${availableSpear}/${this.SPEAR_PER_ATTACK})`);
        this.logger.debug(`  - Max attacks from sword: ${maxAttacksFromSword} (${availableSword}/${this.SWORD_PER_ATTACK})`);

        return result;
    }

    /**
     * Zwraca następny cel do ataku na podstawie aktualnego indeksu
     * @param villages Lista wiosek barbarzyńskich
     * @param currentIndex Aktualny indeks (może być większy niż długość listy)
     * @returns Następna wioska do ataku i zaktualizowany indeks
     */
    public static getNextTarget(villages: BarbarianVillage[], currentIndex: number): { village: BarbarianVillage; nextIndex: number } {
        if (villages.length === 0) {
            throw new Error('No barbarian villages available for attack');
        }

        // Użyj modulo żeby zapewnić cykliczne przechodzenie przez listę
        const targetIndex = currentIndex % villages.length;
        const targetVillage = villages[targetIndex];
        const nextIndex = targetIndex + 1;

        this.logger.debug(`Selected target: ${targetVillage.name} (${targetVillage.coordinateX}|${targetVillage.coordinateY}) at index ${targetIndex}`);
        this.logger.debug(`Next index will be: ${nextIndex} (${nextIndex % villages.length} after modulo)`);

        return {
            village: targetVillage,
            nextIndex
        };
    }

    /**
     * Weryfikuje czy wioska nadal należy do "Barbarzyńskie"
     * @param page Instancja strony Playwright
     * @param targetVillage Wioska do weryfikacji
     * @returns Wynik weryfikacji właściciela
     */
    public static async verifyVillageOwner(page: Page, targetVillage: BarbarianVillage): Promise<VillageOwnerVerification> {
        this.logger.debug(`Verifying owner of village: ${targetVillage.name} (${targetVillage.coordinateX}|${targetVillage.coordinateY})`);

        try {
            const villageInfoElement = page.locator('.village-info');

            if (await villageInfoElement.isVisible({ timeout: 5000 })) {
                const villageInfoText = await villageInfoElement.textContent();
                this.logger.debug(`Village info text: "${villageInfoText}"`);

                if (villageInfoText) {
                    // Wyciągnij właściciela z tekstu (format: "Właściciel: Barbarzyńskie Punkty: 78")
                    const ownerMatch = villageInfoText.match(/Właściciel:\s*([^\s]+)/);
                    const owner = ownerMatch ? ownerMatch[1].trim() : '';

                    this.logger.debug(`Extracted owner: "${owner}"`);

                    if (owner !== 'Barbarzyńskie') {
                        this.logger.warn(`⚠️ Village is no longer barbarian! Current owner: "${owner}" (expected: "Barbarzyńskie")`);
                        return {
                            isValid: false,
                            owner,
                            error: `Village is no longer barbarian! Current owner: "${owner}" (expected: "Barbarzyńskie")`
                        };
                    }

                    this.logger.debug(`✅ Village owner verified: "${owner}"`);

                    return {
                        isValid: true,
                        owner
                    };
                } else {
                    const errorMessage = 'Could not extract village info text';
                    this.logger.warn(`⚠️ ${errorMessage}`);

                    return {
                        isValid: false,
                        owner: '',
                        error: errorMessage
                    };
                }
            } else {
                const errorMessage = 'Village info element not found - might be different page layout';
                this.logger.warn(`⚠️ ${errorMessage}`);

                // W tym przypadku zakładamy że może być inna struktura strony, więc nie blokujemy
                return {
                    isValid: true, // Pozwalamy kontynuować w przypadku problemów z layoutem
                    owner: 'unknown',
                    error: errorMessage
                };
            }
        } catch (error) {
            const errorMessage = `Error during village owner verification: ${error.message}`;
            this.logger.error(errorMessage);

            return {
                isValid: false,
                owner: '',
                error: errorMessage
            };
        }
    }

    /**
     * Sprawdza czy można atakować wioskę na podstawie ostatniego ataku
     * @param page Instancja strony Playwright
     * @param targetVillage Wioska do sprawdzenia
     * @param sourceVillageId ID wioski źródłowej
     * @param serverCode Kod serwera (np. 'pl217')
     * @returns Wynik sprawdzenia czy można atakować
     */
    public static async checkLastAttackResult(
        page: Page,
        targetVillage: BarbarianVillage,
        sourceVillageId: string = this.SOURCE_VILLAGE_ID,
        serverCode: string
    ): Promise<LastAttackCheckResult> {
        this.logger.log(`🔍 Checking last attack result for ${targetVillage.name} (${targetVillage.coordinateX}|${targetVillage.coordinateY})`);

        try {
            // Skonstruuj URL informacji o wiosce
            const infoUrl = `https://${serverCode}.plemiona.pl/game.php?village=${sourceVillageId}&screen=info_village&id=${targetVillage.target}`;
            this.logger.debug(`Info URL: ${infoUrl}`);

            // Nawiguj do strony informacji o wiosce
            this.logger.debug('Navigating to village info page...');
            await page.goto(infoUrl, { waitUntil: 'networkidle', timeout: 15000 });
            await page.waitForTimeout(2000);

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

    /**
     * Wykonuje mini atak na wioskę barbarzyńską z użyciem lekkiej kawalerii (2 jednostki)
     * @param page Instancja Playwright Page
     * @param targetVillage Dane wioski docelowej
     * @param sourceVillageId ID wioski źródłowej (opcjonalne, domyślnie SOURCE_VILLAGE_ID)
     * @param serverCode Kod serwera (np. 'pl217')
     * @param lightCount Liczba lekkiej kawalerii do wysłania (opcjonalne, domyślnie 2)
     * @returns Wynik ataku
     */
    public static async performMiniAttack(
        page: Page,
        targetVillage: BarbarianVillage,
        sourceVillageId: string = this.SOURCE_VILLAGE_ID,
        serverCode: string,
        lightCount: number = this.LIGHT_PER_ATTACK
    ): Promise<AttackResult> {
        this.logger.log(`🗡️ Starting mini attack on ${targetVillage.name} (${targetVillage.coordinateX}|${targetVillage.coordinateY})`);

        try {
            // Skonstruuj URL ataku
            const attackUrl = `https://${serverCode}.plemiona.pl/game.php?village=${sourceVillageId}&screen=place&target=${targetVillage.target}`;
            this.logger.debug(`Attack URL: ${attackUrl}`);

            // Nawiguj do strony ataku
            this.logger.debug('Navigating to attack page...');
            await page.goto(attackUrl, { waitUntil: 'networkidle', timeout: 15000 });
            await page.waitForTimeout(1000);

            // Sprawdź czy strona się załadowała poprawnie
            const formExists = await page.locator('#command-data-form').isVisible({ timeout: 5000 });
            if (!formExists) {
                throw new Error(ERROR_MESSAGE_ATTACK_FORM_NOT_FOUND);
            }

            this.logger.debug('Attack page loaded successfully');

            // Weryfikacja właściciela wioski - sprawdź czy nadal należy do "Barbarzyńskie"
            const ownerVerification = await this.verifyVillageOwner(page, targetVillage);

            if (!ownerVerification.isValid) {
                return {
                    success: false,
                    targetVillage,
                    error: ownerVerification.error || 'Village owner verification failed',
                    attackUrl
                };
            }

            this.logger.debug('✅ Village owner verification passed - proceeding with attack');

            // Wypełnij pole lekkiej kawalerii (customowa liczba jednostek)
            this.logger.debug(`Filling light cavalry field with ${lightCount} units...`);
            const lightInput = page.locator('#unit_input_light');
            await lightInput.fill(lightCount.toString());
            await page.waitForTimeout(1000);

            // Kliknij przycisk ataku
            this.logger.debug('Clicking attack button...');
            const attackButton = page.locator('#target_attack');
            if (await attackButton.isVisible({ timeout: 5000 })) {
                await attackButton.click();
                this.logger.debug('Attack button clicked successfully');

                // Poczekaj na załadowanie strony potwierdzenia
                await page.waitForLoadState('networkidle', { timeout: 10000 });
                await page.waitForTimeout(1000);
                this.logger.debug('Confirmation page loaded');

                // Kliknij przycisk potwierdzenia
                this.logger.debug('Clicking confirmation button...');
                const confirmButton = page.locator('#troop_confirm_submit');
                if (await confirmButton.isVisible({ timeout: 5000 })) {
                    await confirmButton.click();
                    this.logger.debug('Confirmation button clicked successfully');

                    // Poczekaj na finalizację
                    await page.waitForTimeout(1000);

                    this.logger.log(`✅ Mini attack completed successfully: ${targetVillage.name} (${targetVillage.coordinateX}|${targetVillage.coordinateY})`);

                    return {
                        success: true,
                        targetVillage,
                        attackUrl
                    };

                } else {
                    throw new Error('Confirmation button not found or not visible');
                }

            } else {
                throw new Error(ERROR_MESSAGE_ATTACK_BUTTON_NOT_FOUND);
            }

        } catch (error) {
            this.logger.error(`❌ Mini attack failed on ${targetVillage.name} (${targetVillage.coordinateX}|${targetVillage.coordinateY}):`, error);
            // throw new Error(this.ERROR_MESSAGE_ATTACK_BUTTON_NOT_FOUND);
            return {
                success: false,
                targetVillage,
                error: error.message,
                attackUrl: `https://${serverCode}.plemiona.pl/game.php?village=${sourceVillageId}&screen=place&target=${targetVillage.target}`
            };
        }
    }

    /**
     * Wykonuje mini atak na wioskę barbarzyńską z użyciem pikinierów i mieczników (2+2 jednostki)
     * @param page Instancja strony Playwright
     * @param targetVillage Wioska docelowa
     * @param sourceVillageId ID wioski źródłowej (opcjonalne, domyślnie SOURCE_VILLAGE_ID)
     * @param serverCode Kod serwera (np. 'pl217')
     * @param spearCount Liczba pikinierów do wysłania (opcjonalne, domyślnie 2)
     * @param swordCount Liczba mieczników do wysłania (opcjonalne, domyślnie 2)
     * @returns Wynik ataku
     */
    public static async performMiniAttackSpearSword(
        page: Page,
        targetVillage: BarbarianVillage,
        sourceVillageId: string = this.SOURCE_VILLAGE_ID,
        serverCode: string,
        spearCount: number = this.SPEAR_PER_ATTACK,
        swordCount: number = this.SWORD_PER_ATTACK
    ): Promise<AttackResult> {
        this.logger.log(`🗡️ Starting mini attack with spear & sword on ${targetVillage.name} (${targetVillage.coordinateX}|${targetVillage.coordinateY})`);

        try {
            // Skonstruuj URL ataku
            const attackUrl = `https://${serverCode}.plemiona.pl/game.php?village=${sourceVillageId}&screen=place&target=${targetVillage.target}`;
            this.logger.debug(`Attack URL: ${attackUrl}`);

            // Nawiguj do strony ataku
            this.logger.debug('Navigating to attack page...');
            await page.goto(attackUrl, { waitUntil: 'networkidle', timeout: 15000 });
            await page.waitForTimeout(1000);

            // Sprawdź czy strona się załadowała poprawnie
            const formExists = await page.locator('#command-data-form').isVisible({ timeout: 5000 });
            if (!formExists) {
                // handle recapcha
                throw new Error(ERROR_MESSAGE_ATTACK_FORM_NOT_FOUND);
            }

            this.logger.debug('Attack page loaded successfully');

            // Weryfikacja właściciela wioski - sprawdź czy nadal należy do "Barbarzyńskie"
            const ownerVerification = await this.verifyVillageOwner(page, targetVillage);

            if (!ownerVerification.isValid) {
                return {
                    success: false,
                    targetVillage,
                    error: ownerVerification.error || 'Village owner verification failed',
                    attackUrl
                };
            }

            this.logger.debug('✅ Village owner verification passed - proceeding with attack');

            // Wypełnij pole spear (customowa liczba jednostek)
            this.logger.debug(`Filling spear field with ${spearCount} units...`);
            const spearInput = page.locator('#unit_input_spear');
            await spearInput.fill(spearCount.toString());
            this.logger.debug('⏳ Waiting 0.5 second');
            await page.waitForTimeout(500);

            // Wypełnij pole sword (customowa liczba jednostek)
            this.logger.debug(`Filling sword field with ${swordCount} units...`);
            const swordInput = page.locator('#unit_input_sword');
            await swordInput.fill(swordCount.toString());
            this.logger.debug('⏳ Waiting 0.5 second');
            await page.waitForTimeout(500);

            // Kliknij przycisk ataku
            this.logger.debug('Clicking attack button...');
            const attackButton = page.locator('#target_attack');
            if (await attackButton.isVisible({ timeout: 5000 })) {
                await attackButton.click();
                this.logger.debug('Attack button clicked successfully');

                // Poczekaj na załadowanie strony potwierdzenia
                await page.waitForLoadState('networkidle', { timeout: 10000 });
                this.logger.debug('⏳ Waiting 0.5 second');
                await page.waitForTimeout(500);
                this.logger.debug('Confirmation page loaded');

                // Kliknij przycisk potwierdzenia
                this.logger.debug('Clicking confirmation button...');
                const confirmButton = page.locator('#troop_confirm_submit');
                if (await confirmButton.isVisible({ timeout: 5000 })) {
                    await confirmButton.click();
                    this.logger.debug('Confirmation button clicked successfully');

                    // Poczekaj na finalizację
                    this.logger.debug('⏳ Waiting 0.5 second');
                    await page.waitForTimeout(500);

                    this.logger.log(`✅ Mini attack with spear & sword completed successfully: ${targetVillage.name} (${targetVillage.coordinateX}|${targetVillage.coordinateY})`);

                    return {
                        success: true,
                        targetVillage,
                        attackUrl
                    };

                } else {
                    throw new Error('Confirmation button not found or not visible');
                }

            } else {
                throw new Error(ERROR_MESSAGE_ATTACK_BUTTON_NOT_FOUND);
            }

        } catch (error) {
            this.logger.error(`❌ Mini attack with spear & sword failed on ${targetVillage.name} (${targetVillage.coordinateX}|${targetVillage.coordinateY}):`, error);

            throw new Error(ERROR_MESSAGE_ATTACK_BUTTON_NOT_FOUND);

            // return {
            //     success: false,
            //     targetVillage,
            //     error: error.message,
            //     attackUrl: `https://${serverCode}.plemiona.pl/game.php?village=${sourceVillageId}&screen=place&target=${targetVillage.target}`
            // };
        }
    }

    /**
     * Loguje podsumowanie ataków
     * @param results Lista wyników ataków
     * @param totalAvailableAttacks Liczba dostępnych ataków na początku
     * @param startingIndex Indeks startowy
     * @param finalIndex Finalny indeks
     */
    public static logAttackSummary(
        results: AttackResult[],
        totalAvailableAttacks: number,
        startingIndex: number,
        finalIndex: number
    ): void {
        const successfulAttacks = results.filter(r => r.success);
        const failedAttacks = results.filter(r => !r.success);

        this.logger.log('=== MINI ATTACKS SUMMARY ===');
        this.logger.log(`Total available attacks: ${totalAvailableAttacks}`);
        this.logger.log(`Attacks attempted: ${results.length}`);
        this.logger.log(`Successful attacks: ${successfulAttacks.length}`);
        this.logger.log(`Failed attacks: ${failedAttacks.length}`);
        this.logger.log(`Starting target index: ${startingIndex}`);
        this.logger.log(`Final target index: ${finalIndex}`);

        if (successfulAttacks.length > 0) {
            this.logger.log('✅ Successful targets:');
            successfulAttacks.forEach((result, index) => {
                this.logger.log(`  ${index + 1}. ${result.targetVillage.name} (${result.targetVillage.coordinateX}|${result.targetVillage.coordinateY})`);
            });
        }

        if (failedAttacks.length > 0) {
            this.logger.log('❌ Failed targets:');
            failedAttacks.forEach((result, index) => {
                this.logger.log(`  ${index + 1}. ${result.targetVillage.name} (${result.targetVillage.coordinateX}|${result.targetVillage.coordinateY}) - ${result.error}`);
            });
        }

        this.logger.log('============================');
    }

    /**
     * Sprawdza czy dostępne jest wystarczające wojsko do wykonania ataku
     * @param armyData Dane o wojsku
     * @returns true jeśli jest wystarczające wojsko, false w przeciwnym razie
     */
    public static hasEnoughTroopsForAttack(armyData: ArmyData): boolean {
        const calculation = this.calculateAvailableAttacks(armyData);
        const hasEnough = calculation.maxAttacks > 0;

        this.logger.debug(`Troops check: ${hasEnough ? 'sufficient' : 'insufficient'} troops for attack`);

        return hasEnough;
    }

    /**
     * Sprawdza czy dostępne jest wystarczające wojsko do wykonania ataku (piki i miecze)
     * @param armyData Dane o wojsku
     * @returns true jeśli jest wystarczające wojsko, false w przeciwnym razie
     */
    public static hasEnoughTroopsForAttackSpearSword(armyData: ArmyData): boolean {
        const calculation = this.calculateAvailableAttacksSpearSword(armyData);
        const hasEnough = calculation.maxAttacks > 0;

        this.logger.debug(`Troops check (spear & sword): ${hasEnough ? 'sufficient' : 'insufficient'} troops for attack`);

        return hasEnough;
    }

    /**
     * Weryfikuje czy wioska gracza nadal należy do tego samego właściciela
     * @param page Instancja strony Playwright
     * @param targetVillage Wioska gracza do weryfikacji
     * @returns Wynik weryfikacji właściciela wioski gracza
     */
    public static async verifyPlayerVillageOwner(page: Page, targetVillage: PlayerVillage): Promise<PlayerVillageOwnerVerification> {
        this.logger.debug(`Verifying owner of player village: ${targetVillage.name} (${targetVillage.coordinateX}|${targetVillage.coordinateY})`);

        try {
            const infoUrl = `https://${targetVillage.serverId}.plemiona.pl/game.php?village=${targetVillage.villageId}&screen=info_village&id=${targetVillage.target}`;
            await page.goto(infoUrl);
            await page.waitForTimeout(1000);

            const villageData = await page.evaluate(() => {
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
                    ownerId: playerLink?.getAttribute('href')?.match(/player\/(\d+)/)?.[1] || undefined,
                    tribe: tribeLink?.textContent?.trim() || undefined,
                    tribeId: tribeLink?.getAttribute('href')?.match(/tribe\/(\d+)/)?.[1] || undefined,
                };
            });

            // Sprawdź czy właściciel się zmienił
            const ownerChanged = villageData.owner !== targetVillage.owner;

            if (ownerChanged) {
                this.logger.warn(`Player village owner changed: ${targetVillage.owner} -> ${villageData.owner}`);
                return {
                    isValid: false,
                    owner: villageData.owner,
                    ownerId: villageData.ownerId,
                    tribe: villageData.tribe,
                    tribeId: villageData.tribeId,
                    points: villageData.points,
                    population: 0, // Populacja nie jest dostępna z tej strony
                    error: `Owner changed from ${targetVillage.owner} to ${villageData.owner}`,
                };
            }

            return {
                isValid: true,
                owner: villageData.owner,
                ownerId: villageData.ownerId,
                tribe: villageData.tribe,
                tribeId: villageData.tribeId,
                points: villageData.points,
                population: 0, // Populacja nie jest dostępna z tej strony
            };
        } catch (error) {
            this.logger.error(`Error verifying player village owner: ${error.message}`);
            return {
                isValid: false,
                owner: '',
                points: 0,
                population: 0,
                error: error.message,
            };
        }
    }

    /**
     * Wykonuje atak na wioskę gracza używając określonej strategii
     * @param page Instancja strony Playwright
     * @param targetVillage Wioska gracza do ataku
     * @param sourceVillageId ID wioski źródłowej
     * @param serverCode Kod serwera
     * @param attackStrategy Strategia ataku
     * @returns Wynik ataku na wioskę gracza
     */
    public static async performPlayerVillageAttack(
        page: Page,
        targetVillage: PlayerVillage,
        sourceVillageId: string,
        serverCode: string,
        attackStrategy: PlayerVillageAttackStrategy
    ): Promise<PlayerVillageAttackResult> {
        this.logger.debug(`Performing attack on player village: ${targetVillage.name} (${targetVillage.coordinateX}|${targetVillage.coordinateY})`);

        try {
            // Weryfikacja właściciela wioski przed atakiem
            const ownerVerification = await this.verifyPlayerVillageOwner(page, targetVillage);

            if (!ownerVerification.isValid) {
                return {
                    success: false,
                    targetVillage,
                    error: `Owner verification failed: ${ownerVerification.error}`,
                };
            }

            // Przejdź do strony ataku
            const attackUrl = `https://${serverCode}.plemiona.pl/game.php?village=${sourceVillageId}&screen=place&target=${targetVillage.target}`;
            await page.goto(attackUrl);
            await page.waitForTimeout(2000);

            // Sprawdź czy strona ataku się załadowała
            const attackForm = page.locator('#attack_form');
            if (!(await attackForm.isVisible())) {
                return {
                    success: false,
                    targetVillage,
                    error: 'Attack form not visible',
                    attackUrl,
                };
            }

            // Wypełnij formularz ataku zgodnie ze strategią
            await this.fillAttackFormWithStrategy(page, attackStrategy);

            // Wyślij atak
            const sendButton = page.locator('#attack_confirm_go');
            if (await sendButton.isVisible()) {
                await sendButton.click();
                await page.waitForTimeout(1000);
            }

            this.logger.debug(`Attack sent to player village: ${targetVillage.name}`);
            return {
                success: true,
                targetVillage,
                attackUrl,
            };
        } catch (error) {
            this.logger.error(`Error performing attack on player village: ${error.message}`);
            return {
                success: false,
                targetVillage,
                error: error.message,
                attackUrl: `https://${serverCode}.plemiona.pl/game.php?village=${sourceVillageId}&screen=place&target=${targetVillage.target}`,
            };
        }
    }

    /**
     * Wypełnia formularz ataku zgodnie ze strategią
     * @param page Instancja strony Playwright
     * @param attackStrategy Strategia ataku
     */
    private static async fillAttackFormWithStrategy(page: Page, attackStrategy: PlayerVillageAttackStrategy): Promise<void> {
        const unitFields = {
            'spear': attackStrategy.spear,
            'sword': attackStrategy.sword,
            'axe': attackStrategy.axe,
            'archer': attackStrategy.archer,
            'spy': attackStrategy.spy,
            'light': attackStrategy.light,
            'marcher': attackStrategy.marcher,
            'heavy': attackStrategy.heavy,
            'ram': attackStrategy.ram,
            'catapult': attackStrategy.catapult,
            'knight': attackStrategy.knight,
            'snob': attackStrategy.snob,
        };

        for (const [unitType, count] of Object.entries(unitFields)) {
            if (count > 0) {
                const input = page.locator(`input[name="${unitType}"]`);
                if (await input.isVisible()) {
                    await input.fill(count.toString());
                }
            }
        }
    }
} 