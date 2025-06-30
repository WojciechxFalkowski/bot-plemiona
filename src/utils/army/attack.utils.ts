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
    createdAt: Date;
    updatedAt: Date;
}

// Interfejs dla wyniku obliczenia dostępnych ataków
export interface AttackCalculationResult {
    maxAttacks: number;
    availableSpear: number;
    availableSword: number;
    spearPerAttack: number;
    swordPerAttack: number;
}

// Interfejs dla wyniku ataku
export interface AttackResult {
    success: boolean;
    targetVillage: BarbarianVillage;
    error?: string;
    attackUrl?: string;
}

export class AttackUtils {
    private static readonly logger = new Logger(AttackUtils.name);

    // Stałe dla mini ataków
    private static readonly SPEAR_PER_ATTACK = 2;
    private static readonly SWORD_PER_ATTACK = 2;
    private static readonly WORLD_NUMBER = '216';
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

        // Znajdź dane o spear i sword
        const spearUnit = armyData.units.find(unit => unit.dataUnit === 'spear');
        const swordUnit = armyData.units.find(unit => unit.dataUnit === 'sword');

        const availableSpear = spearUnit?.inVillage || 0;
        const availableSword = swordUnit?.inVillage || 0;

        // Oblicz ile ataków można wykonać (każdy atak wymaga 2 spear + 2 sword)
        const maxAttacksFromSpear = Math.floor(availableSpear / this.SPEAR_PER_ATTACK);
        const maxAttacksFromSword = Math.floor(availableSword / this.SWORD_PER_ATTACK);
        const maxAttacks = Math.min(maxAttacksFromSpear, maxAttacksFromSword);

        const result: AttackCalculationResult = {
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
     * Wykonuje pojedynczy mini atak na wybraną wioskę barbarzyńską
     * @param page Instancja strony Playwright
     * @param targetVillage Wioska docelowa
     * @param sourceVillageId ID wioski źródłowej (opcjonalne, domyślnie SOURCE_VILLAGE_ID)
     * @returns Wynik ataku
     */
    public static async performMiniAttack(
        page: Page,
        targetVillage: BarbarianVillage,
        sourceVillageId: string = this.SOURCE_VILLAGE_ID
    ): Promise<AttackResult> {
        this.logger.log(`🗡️ Starting mini attack on ${targetVillage.name} (${targetVillage.coordinateX}|${targetVillage.coordinateY})`);

        try {
            // Skonstruuj URL ataku
            const attackUrl = `https://pl${this.WORLD_NUMBER}.plemiona.pl/game.php?village=${sourceVillageId}&screen=place&target=${targetVillage.target}`;
            this.logger.debug(`Attack URL: ${attackUrl}`);

            // Nawiguj do strony ataku
            this.logger.debug('Navigating to attack page...');
            await page.goto(attackUrl, { waitUntil: 'networkidle', timeout: 15000 });
            await page.waitForTimeout(2000);

            // Sprawdź czy strona się załadowała poprawnie
            const formExists = await page.locator('#command-data-form').isVisible({ timeout: 5000 });
            if (!formExists) {
                throw new Error('Attack form not found on page');
            }

            this.logger.debug('Attack page loaded successfully');

            // Wypełnij pole spear (2 jednostki)
            this.logger.debug(`Filling spear field with ${this.SPEAR_PER_ATTACK} units...`);
            const spearInput = page.locator('#unit_input_spear');
            await spearInput.fill(this.SPEAR_PER_ATTACK.toString());
            await page.waitForTimeout(500);

            // Wypełnij pole sword (2 jednostki)
            this.logger.debug(`Filling sword field with ${this.SWORD_PER_ATTACK} units...`);
            const swordInput = page.locator('#unit_input_sword');
            await swordInput.fill(this.SWORD_PER_ATTACK.toString());
            await page.waitForTimeout(500);

            // Kliknij przycisk ataku
            this.logger.debug('Clicking attack button...');
            const attackButton = page.locator('#target_attack');
            if (await attackButton.isVisible({ timeout: 5000 })) {
                await attackButton.click();
                this.logger.debug('Attack button clicked successfully');

                // Poczekaj na załadowanie strony potwierdzenia
                await page.waitForLoadState('networkidle', { timeout: 10000 });
                await page.waitForTimeout(2000);
                this.logger.debug('Confirmation page loaded');

                // Kliknij przycisk potwierdzenia
                this.logger.debug('Clicking confirmation button...');
                const confirmButton = page.locator('#troop_confirm_submit');
                if (await confirmButton.isVisible({ timeout: 5000 })) {
                    await confirmButton.click();
                    this.logger.debug('Confirmation button clicked successfully');

                    // Poczekaj na finalizację
                    await page.waitForTimeout(3000);

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
                throw new Error('Attack button not found or not visible');
            }

        } catch (error) {
            this.logger.error(`❌ Mini attack failed on ${targetVillage.name} (${targetVillage.coordinateX}|${targetVillage.coordinateY}):`, error);

            // Zrób screenshot w przypadku błędu
            try {
                await page.screenshot({
                    path: `mini_attack_error_${targetVillage.target}_${Date.now()}.png`,
                    fullPage: true
                });
            } catch (screenshotError) {
                this.logger.error('Failed to take error screenshot:', screenshotError);
            }

            return {
                success: false,
                targetVillage,
                error: error.message,
                attackUrl: `https://pl${this.WORLD_NUMBER}.plemiona.pl/game.php?village=${sourceVillageId}&screen=place&target=${targetVillage.target}`
            };
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
} 