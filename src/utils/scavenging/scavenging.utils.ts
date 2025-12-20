import { Page, Locator } from 'playwright';
import { Logger } from '@nestjs/common';
import {
    scavengingSettings,
    unitSettings,
    unitOrder,
    levelPacks,
    availableUnitSelectors,
    unitInputNames,
    levelSelectors,
    ScavengingUnit
} from '../../utils/scavenging.config';
import {
    ScavengeLevelStatus,
    ScavengingLevelTimeData,
    VillageScavengingData,
    ScavengingTimeData,
    LevelDispatchPlan
} from './scavenging.interfaces';
import { UnitFormatter } from '@/utils/formatting/unit-formatter.utils';

export class ScavengingUtils {
    private static logger = new Logger(ScavengingUtils.name);

    /**
     * Sprawdza status każdego poziomu zbieractwa (1-4).
     */
    static async getScavengingLevelStatuses(page: Page): Promise<ScavengeLevelStatus[]> {
        const statuses: ScavengeLevelStatus[] = [];
        // Znajdź wszystkie kontenery opcji zbieractwa
        const levelContainers = await page.locator(levelSelectors.levelContainerBase).all();
        this.logger.debug(`Found ${levelContainers.length} potential level containers using selector: ${levelSelectors.levelContainerBase}`);

        // Przetwórz tylko pierwsze 4 kontenery (lub mniej, jeśli jest ich mniej)
        for (let i = 0; i < Math.min(levelContainers.length, 4); i++) {
            const container = levelContainers[i];
            const level = i + 1; // Poziom 1, 2, 3, 4

            // Sprawdź, czy poziom jest zablokowany (szukając przycisku Odblokowanie)
            const isLocked = await container.locator(levelSelectors.levelUnlockButton).isVisible({ timeout: 3000 });

            // Sprawdź, czy poziom jest w trakcie odblokowywania
            const isUnlocking = await container.locator('.unlocking-view').isVisible({ timeout: 3000 });

            // Sprawdź, czy poziom ma przycisk Start (jest potencjalnie dostępny)
            const hasStartButton = await container.locator(levelSelectors.levelStartButton).isVisible({ timeout: 3000 });

            // Określ stan:
            const isAvailable = !isLocked && !isUnlocking && hasStartButton;
            // Zajęty, jeśli nie jest zablokowany, nie jest w trakcie odblokowywania i nie jest dostępny (nie ma przycisku Start)
            const isBusy = !isLocked && !isUnlocking && !isAvailable;

            statuses.push({
                level,
                isLocked,
                isBusy,
                isAvailable,
                isUnlocking,
                containerLocator: container
            });
        }

        // Wyświetl statusy w formie tabelki
        UnitFormatter.logLevelsStatusTable(statuses, 'Scavenging levels status', { logLevel: 'debug' });

        // Zwróć statusy (maksymalnie 4)
        return statuses;
    }

    /**
     * Odczytuje liczbę dostępnych jednostek.
     */
    static async getAvailableUnits(page: Page): Promise<Partial<Record<ScavengingUnit, number>>> {
        const units: Partial<Record<ScavengingUnit, number>> = {};
        this.logger.debug('Reading available unit counts...');

        const table = page.locator('.candidate-squad-widget');

        // Znajdź drugi wiersz (z jednostkami)
        const armyRow = table.locator('tbody tr:nth-child(2)');

        // Iteruj przez wszystkie jednostki w unitOrder
        for (const unit of unitOrder) {
            try {
                // Znajdź link z data-unit dla tej jednostki
                const unitLink = armyRow.locator(`a[data-unit="${unit}"]`);

                if (await unitLink.isVisible({ timeout: 2000 })) {
                    const countText = await unitLink.textContent();

                    // Wyciągnij liczbę z nawiasów np. "(29)" -> 29
                    const match = countText?.match(/\((\d+)\)/);
                    units[unit] = match ? parseInt(match[1], 10) : 0;
                } else {
                    this.logger.debug(`Unit link not visible for: ${unit}`);
                    units[unit] = 0;
                }

            } catch (error) {
                // Rozróżnij błąd timeout od innych błędów
                if (error.name === 'TimeoutError') {
                    this.logger.warn(`Timeout waiting for unit element: ${unit}. Assuming 0 units.`);
                } else {
                    this.logger.warn(`Could not read available count for unit: ${unit}`, error);
                }
                units[unit] = 0;
            }
        }

        UnitFormatter.logUnitsTable(units, 'Available units', {
            unitOrder: unitOrder as string[],
            logLevel: 'debug'
        });
        return units;
    }

    /**
     * Mapuje nazwę jednostki na nazwę pola limitu w obiekcie unitLimits.
     */
    private static getUnitLimitKey(unit: ScavengingUnit): string {
        const unitNameMap: Record<ScavengingUnit, string> = {
            spear: 'maxSpearUnits',
            sword: 'maxSwordUnits',
            axe: 'maxAxeUnits',
            archer: 'maxArcherUnits',
            light: 'maxLightUnits',
            marcher: 'maxMarcherUnits',
            heavy: 'maxHeavyUnits',
        };
        return unitNameMap[unit];
    }

    /**
     * Oblicza dystrybucję wojsk na dostępne poziomy.
     * Uwzględnia wszystkie włączone jednostki i limity dla każdej jednostki.
     */
    static calculateTroopDistribution(
        availableUnits: Partial<Record<ScavengingUnit, number>>,
        freeLevels: ScavengeLevelStatus[],
        enabledUnits: Record<ScavengingUnit, boolean>,
        unitLimits?: {
            maxSpearUnits?: number | null;
            maxSwordUnits?: number | null;
            maxAxeUnits?: number | null;
            maxArcherUnits?: number | null;
            maxLightUnits?: number | null;
            maxMarcherUnits?: number | null;
            maxHeavyUnits?: number | null;
        }
    ): LevelDispatchPlan[] | null {

        const dispatchPlan: LevelDispatchPlan[] = freeLevels.map(l => ({ level: l.level, dispatchUnits: {} }));
        let totalPacks = 0;

        // Filtruj poziomy i oblicz sumę packów zgodnie z skip_level_1
        const eligibleLevels = freeLevels.filter(levelStatus => {
            if (levelStatus.level === 1 && scavengingSettings.skip_level_1 === 1 && freeLevels.length > 1) {
                this.logger.log('Skipping level 1 due to skip_level_1 setting.');
                return false;
            }
            if (levelPacks[levelStatus.level]) {
                totalPacks += levelPacks[levelStatus.level];
                return true;
            }
            return false;
        });

        if (eligibleLevels.length === 0 || totalPacks === 0) {
            this.logger.warn('No eligible levels for distribution or totalPacks is zero.');
            return null;
        }

        this.logger.debug(`Total packs for distribution: ${totalPacks}`);

        // Krok 1: Filtrowanie dostępnych jednostek - tylko włączone i dostępne
        const eligibleUnits: Partial<Record<ScavengingUnit, number>> = {};
        for (const unit of unitOrder) {
            if (enabledUnits[unit] && (availableUnits[unit] || 0) > 0) {
                eligibleUnits[unit] = availableUnits[unit] || 0;
            }
        }

        if (Object.keys(eligibleUnits).length === 0) {
            this.logger.warn('No eligible units found (no enabled units with available count > 0).');
            return null;
        }

        // Krok 2: Zastosowanie limitów dla każdej jednostki
        const effectiveUnits: Partial<Record<ScavengingUnit, number>> = {};
        for (const unit of unitOrder) {
            if (eligibleUnits[unit] !== undefined) {
                const available = eligibleUnits[unit]!;
                const limitKey = this.getUnitLimitKey(unit);
                const limit = unitLimits?.[limitKey as keyof typeof unitLimits];

                if (limit !== null && limit !== undefined) {
                    effectiveUnits[unit] = Math.min(available, limit);
                    if (limit < available) {
                        this.logger.log(`Applied ${unit} limit: ${available} available → ${effectiveUnits[unit]} used (limit: ${limit})`);
                    }
                } else {
                    effectiveUnits[unit] = available;
                }
            }
        }

        // Logowanie informacji o używanych jednostkach
        const unitsString = Object.entries(effectiveUnits)
            .map(([unit, count]) => `${unit}=${count}`)
            .join(', ');
        this.logger.debug(`Using units for scavenging: ${unitsString}`);

        // Krok 3: Rozdziel wszystkie jednostki proporcjonalnie na poziomy
        for (const levelStatus of eligibleLevels) {
            const level = levelStatus.level;
            const levelPack = levelPacks[level];
            const plan = dispatchPlan.find(p => p.level === level);
            if (!plan) continue;

            // Dla każdej jednostki oblicz proporcjonalną dystrybucję
            for (const unit of unitOrder) {
                if (effectiveUnits[unit] !== undefined) {
                    const countForLevel = Math.floor((effectiveUnits[unit]! * levelPack) / totalPacks);
                    plan.dispatchUnits[unit] = countForLevel;
                } else {
                    plan.dispatchUnits[unit] = 0;
                }
            }
        }

        // Krok 4: Zastosuj limit max_resources dla każdego poziomu osobno (wszystkie jednostki)
        for (const plan of dispatchPlan) {
            // Oblicz całkowitą pojemność dla wszystkich jednostek
            let totalCapacity = 0;
            for (const unit of unitOrder) {
                const count = plan.dispatchUnits[unit] || 0;
                totalCapacity += count * unitSettings[unit].capacity;
            }

            let levelMaxResources = scavengingSettings.max_resources;
            // Dostosuj max_resources dla poziomu (logika z JS)
            if (eligibleLevels.length === 1) levelMaxResources *= 10;
            else if (eligibleLevels.length === 2) levelMaxResources *= 4;
            else if (eligibleLevels.length === 3) levelMaxResources *= 2;
            else levelMaxResources *= 1.3333;

            if (totalCapacity > levelMaxResources) {
                const ratio = levelMaxResources / totalCapacity;
                this.logger.debug(`Level ${plan.level} total capacity ${totalCapacity} exceeds limit ${levelMaxResources}. Applying ratio ${ratio}.`);
                
                // Zastosuj ratio do wszystkich jednostek
                for (const unit of unitOrder) {
                    const currentCount = plan.dispatchUnits[unit] || 0;
                    plan.dispatchUnits[unit] = Math.floor(currentCount * ratio);
                }
            }
        }

        // Zwróć tylko plany dla poziomów, które były brane pod uwagę
        return dispatchPlan.filter(p => eligibleLevels.some(el => el.level === p.level));
    }

    /**
     * Zbiera szczegółowe dane o czasach scavenging dla konkretnej wioski
     */
    static async collectScavengingTimeData(page: Page, villageId: string, villageName: string): Promise<VillageScavengingData> {
        const now = new Date();
        const levels: ScavengingLevelTimeData[] = [];

        await page.waitForTimeout(1000); // wait 1 second

        try {
            // Pobierz aktualny status poziomów
            const levelStatuses = await this.getScavengingLevelStatuses(page);

            for (const levelStatus of levelStatuses) {
                let timeRemaining: string | null = null;
                let timeRemainingSeconds = 0;
                let status: 'busy' | 'available' | 'locked' | 'unlocking';
                let estimatedCompletionTime: Date | undefined;

                // Określ status poziomu
                if (levelStatus.isLocked) {
                    status = 'locked';
                } else if (levelStatus.isUnlocking) {
                    status = 'unlocking';
                    // Spróbuj odczytać czas do odblokowania
                    try {
                        const unlockCountdownElement = levelStatus.containerLocator.locator('.unlock-countdown-text');
                        if (await unlockCountdownElement.isVisible({ timeout: 2000 })) {
                            timeRemaining = await unlockCountdownElement.textContent({ timeout: 2000 });
                            if (timeRemaining) {
                                timeRemainingSeconds = this.parseTimeToSeconds(timeRemaining.trim());
                                estimatedCompletionTime = new Date(now.getTime() + (timeRemainingSeconds * 1000));
                            }
                        }
                    } catch (error) {
                        // Błąd odczytu czasu - zostanie pokazany w tabelce jako brak danych
                    }
                } else if (levelStatus.isBusy) {
                    status = 'busy';
                    // Spróbuj odczytać czas pozostały do końca misji
                    try {
                        const timerElement = levelStatus.containerLocator.locator(levelSelectors.levelTimeRemaining);
                        if (await timerElement.isVisible({ timeout: 2000 })) {
                            timeRemaining = await timerElement.textContent({ timeout: 2000 });
                            if (timeRemaining) {
                                timeRemainingSeconds = this.parseTimeToSeconds(timeRemaining.trim());
                                estimatedCompletionTime = new Date(now.getTime() + (timeRemainingSeconds * 1000));
                            }
                        }
                    } catch (error) {
                        // Błąd odczytu czasu - zostanie pokazany w tabelce jako brak danych
                    }
                } else {
                    status = 'available';
                }

                levels.push({
                    level: levelStatus.level,
                    timeRemaining,
                    timeRemainingSeconds,
                    status,
                    estimatedCompletionTime
                });
            }

            // Wyświetl dane czasowe w formie tabelki
            UnitFormatter.logLevelsTimeTable(levels, 'Scavenging levels time data', { logLevel: 'debug' });

        } catch (error) {
            this.logger.error(`Error collecting scavenging time data for village ${villageName}:`, error);
        }

        return {
            villageId,
            villageName,
            lastUpdated: now,
            levels
        };
    }

    /**
     * Parsuje tekst czasu do sekund (obsługuje formaty HH:MM:SS, H:MM:SS, MM:SS)
     */
    static parseTimeToSeconds(timeText: string): number {
        try {
            const parts = timeText.split(':').map(Number);

            if (parts.length === 3) {
                // Format HH:MM:SS lub H:MM:SS
                const hours = parts[0];
                const minutes = parts[1];
                const seconds = parts[2];
                return hours * 3600 + minutes * 60 + seconds;
            } else if (parts.length === 2) {
                // Format MM:SS
                const minutes = parts[0];
                const seconds = parts[1];
                return minutes * 60 + seconds;
            } else {
                this.logger.warn(`Invalid time format: ${timeText}`);
                return 0;
            }
        } catch (error) {
            this.logger.warn(`Error parsing time "${timeText}": ${error.message}`);
            return 0;
        }
    }

    /**
     * Oblicza optymalny czas do następnego uruchomienia na podstawie zebranych danych
     * Logika: znajdź najkrótszy z najdłuższych czasów busy z każdej wioski
     */
    static calculateOptimalScheduleTime(scavengingTimeData: ScavengingTimeData): number | null {
        if (!scavengingTimeData.villages || scavengingTimeData.villages.length === 0) {
            this.logger.debug('No village data available for scheduling calculation');
            return null;
        }

        const maxTimesPerVillage: number[] = [];

        // Przejdź po każdej wiosce
        for (const village of scavengingTimeData.villages) {
            if (!village.levels || village.levels.length === 0) {
                // Wioska z błędem podczas zbierania danych - ignoruj w obliczeniach
                this.logger.debug(`Village ${village.villageName} has no level data (error during collection) - ignoring in calculations`);
                continue;
            }

            const busyLevels = village.levels.filter(level => level.status === 'busy');
            const availableLevels = village.levels.filter(level => level.status === 'available');
            const lockedLevels = village.levels.filter(level => level.status === 'locked');
            const unlockingLevels = village.levels.filter(level => level.status === 'unlocking');

            if (busyLevels.length > 0) {
                // Wioska ma aktywne misje - znajdź najdłuższy czas spośród busy levels
                const maxTimeInVillage = Math.max(...busyLevels.map(level => level.timeRemainingSeconds));
                maxTimesPerVillage.push(maxTimeInVillage);
                this.logger.debug(`Village ${village.villageName} max busy time: ${maxTimeInVillage}s`);
            } else if (availableLevels.length > 0) {
                // Wioska ma dostępne poziomy - ale sprawdź czy można wysłać wojska
                // Jeśli ta wioska była przetwarzana w tym cyklu, to prawdopodobnie właśnie wysłano z niej wojska
                // i nie powinna być uznawana za "gotową do dispatch" (czyli 0s)

                // Sprawdź czy to jest świeżo zaktualizowana wioska (ostatnia aktualizacja < 5 minut temu)
                const timeSinceUpdate = Date.now() - village.lastUpdated.getTime();
                const fiveMinutesInMs = 5 * 60 * 1000;

                if (timeSinceUpdate < fiveMinutesInMs && busyLevels.length === 0 && availableLevels.length === village.levels.length) {
                    // Ta wioska może nie mieć jednostek lub wszystkie poziomy są rzeczywiście dostępne
                    // Ale jeśli wszystkie poziomy są available i nie ma busy, to znaczy że albo:
                    // 1. Wioska nie ma jednostek do wysłania
                    // 2. Nie udało się wysłać wojsk z powodu błędu
                    // W takim przypadku nie używamy czasu 0s, bo bot by się uruchamiał co 30 sekund

                    // Zamiast 0s, użyj czasu 300s (5 minut) jako domyślny dla wiosek które nie wysłały wojsk
                    maxTimesPerVillage.push(300);
                    this.logger.debug(`Village ${village.villageName} has available levels but likely no troops or failed dispatch - set to 300s (5 min)`);
                } else {
                    // Normalna logika - wioska ma dostępne poziomy i może wysłać wojska
                    maxTimesPerVillage.push(0);
                    this.logger.debug(`Village ${village.villageName} has available levels - set to 0s (ready to dispatch)`);
                }
            } else if (unlockingLevels.length > 0) {
                // Wioska ma poziomy w trakcie odblokowywania - znajdź najkrótszy czas unlocking
                const unlockingTimes = unlockingLevels
                    .map(level => level.timeRemainingSeconds)
                    .filter(time => time > 0);

                if (unlockingTimes.length > 0) {
                    const minUnlockTime = Math.min(...unlockingTimes);
                    maxTimesPerVillage.push(minUnlockTime);
                    this.logger.debug(`Village ${village.villageName} has unlocking levels - shortest unlock time: ${minUnlockTime}s`);
                } else {
                    // Poziomy unlocking ale brak czasu - ustaw na 10 minut
                    maxTimesPerVillage.push(600);
                    this.logger.debug(`Village ${village.villageName} has unlocking levels (no time data) - set to 600s (10 min)`);
                }
            } else {
                // Wioska ma wszystkie poziomy zablokowane - ustaw na długi czas
                maxTimesPerVillage.push(3600); // 1 godzina zamiast infinite
                this.logger.debug(`Village ${village.villageName} has no busy/available/unlocking levels (${lockedLevels.length} locked) - set to 3600s (1 hour)`);
            }
        }

        // Znajdź najkrótszy z najdłuższych czasów
        if (maxTimesPerVillage.length === 0) {
            this.logger.debug('No village times calculated for scheduling');
            return null;
        }

        const shortestMaxTime = Math.min(...maxTimesPerVillage);
        this.logger.debug(`Calculated shortest max time across villages: ${shortestMaxTime}s`);

        return shortestMaxTime;
    }

    /**
     * Fallback metoda do odczytu czasów ze strony (stara logika)
     */
    static async getFallbackScheduleTime(page: Page): Promise<{ maxRemainingTimeSeconds: number; successfullyReadTime: boolean }> {
        let maxRemainingTimeSeconds = 0;
        let successfullyReadTime = false;

        try {
            const levelStatuses = await this.getScavengingLevelStatuses(page);
            const busyLevels = levelStatuses.filter(s => s.isBusy);
            const unlockingLevels = levelStatuses.filter(s => s.isUnlocking);

            // Log info o poziomach w trakcie odblokowywania
            if (unlockingLevels.length > 0) {
                this.logger.log(`Found ${unlockingLevels.length} levels being unlocked: ${unlockingLevels.map(l => l.level).join(', ')}`);

                // Opcjonalnie: Próba odczytania czasu pozostałego do odblokowania
                for (const levelStatus of unlockingLevels) {
                    try {
                        const countdownElement = levelStatus.containerLocator.locator('.unlock-countdown-text');
                        if (await countdownElement.isVisible({ timeout: 2000 })) {
                            const timeText = await countdownElement.textContent({ timeout: 2000 });
                            this.logger.debug(`Level ${levelStatus.level} unlock time remaining: ${timeText}`);
                        }
                    } catch (error) {
                        this.logger.debug(`Could not read unlock time for level ${levelStatus.level}`);
                    }
                }
            }

            // Sprawdź, czy są aktywne misje zbieractwa
            if (busyLevels.length > 0) {
                for (const levelStatus of busyLevels) {
                    try {
                        const timerElement = levelStatus.containerLocator.locator(levelSelectors.levelTimeRemaining);
                        this.logger.debug(`Checking time remaining for level ${levelStatus.level} using selector: ${levelSelectors.levelTimeRemaining}`);

                        if (await timerElement.isVisible({ timeout: 2000 })) {
                            const timeText = await timerElement.textContent({ timeout: 2000 }); // Format HH:MM:SS lub H:MM:SS
                            this.logger.debug(`Found time text for level ${levelStatus.level}: "${timeText}"`);

                            if (timeText) {
                                const remainingSeconds = this.parseTimeToSeconds(timeText.trim());
                                if (remainingSeconds > 0) {
                                    this.logger.debug(`Level ${levelStatus.level} time remaining: ${timeText} (${remainingSeconds}s)`);
                                    maxRemainingTimeSeconds = Math.max(maxRemainingTimeSeconds, remainingSeconds);
                                    successfullyReadTime = true;
                                }
                            }
                        } else {
                            this.logger.debug(`Timer element not visible for level ${levelStatus.level}`);
                        }
                    } catch (timeError) {
                        this.logger.warn(`Could not read remaining time for busy level ${levelStatus.level}:`, timeError);
                    }
                }
            }
        } catch (statusError) {
            this.logger.error('Error getting level statuses for fallback scheduling:', statusError);
        }

        return { maxRemainingTimeSeconds, successfullyReadTime };
    }

    /**
     * Wypełnia formularz jednostkami dla danego poziomu
     */
    static async fillUnitsForLevel(page: Page, levelPlan: LevelDispatchPlan, villageName: string): Promise<boolean> {
        let filledSuccessfully = true;

        for (const unit of unitOrder) {
            const count = levelPlan.dispatchUnits[unit] || 0;
            if (count > 0) {
                try {
                    // Użyj containerLocator, który jest specyficzny dla tego poziomu
                    const inputSelector = `input[name="${unitInputNames[unit]}"]`;
                    const unitInput = await page.locator(inputSelector);

                    if (await unitInput.isVisible({ timeout: 2000 })) {
                        await unitInput.fill(String(count));
                        this.logger.debug(`Filled ${count} ${unit} units for level ${levelPlan.level} in village ${villageName}`);
                    } else {
                        this.logger.warn(`Input field for ${unit} not visible on level ${levelPlan.level} in village ${villageName}`);
                        filledSuccessfully = false;
                    }
                } catch (inputError) {
                    this.logger.error(`Error filling ${unit} input for level ${levelPlan.level} in village ${villageName}:`, inputError);
                    filledSuccessfully = false;
                }
            }
        }

        return filledSuccessfully;
    }

    /**
     * Wylogowuje informacje o wysyłce wojska
     */
    static logDispatchInfo(levelPlan: LevelDispatchPlan, villageName: string): void {
        this.logger.log(`------ WYSYŁKA WOJSKA dla POZIOMU ${levelPlan.level} w ${villageName} ------`);
        this.logger.log(`Wojsko do wysłania na poziom ${levelPlan.level}:`);

        // Oblicz całkowitą liczbę jednostek i pojemność
        let totalUnits = 0;
        let totalCapacity = 0;
        for (const unit of unitOrder) {
            const count = levelPlan.dispatchUnits[unit] || 0;
            if (count > 0) {
                this.logger.log(`  - ${unit}: ${count} jednostek`);
                totalUnits += count;
                totalCapacity += count * unitSettings[unit].capacity;
            }
        }

        this.logger.log(`  * Łącznie: ${totalUnits} jednostek`);
        this.logger.log(`  * Pojemność: ${totalCapacity} surowców`);
        this.logger.log(`----------------------------------------------------`);
    }

    /**
     * Wylogowuje plan dystrybucji dla wioski
     */
    static logDispatchPlan(dispatchPlan: LevelDispatchPlan[], villageName: string): void {
        this.logger.log(`--- Calculated Scavenging Dispatch Plan for ${villageName} ---`);

        // Logowanie planowanej dystrybucji (tylko do logów)
        for (const levelPlan of dispatchPlan) {
            const unitsString = unitOrder
                .map(unit => `${unit}=${levelPlan.dispatchUnits[unit] || 0}`)
                .join(', ');
            this.logger.log(`Level ${levelPlan.level}: ${unitsString}`);
        }
        this.logger.log('---------------------------------------------------');
    }

    /**
     * Wylogowuje zebrane dane o czasach scavenging dla wioski
     */
    static logScavengingTimeData(villageScavengingData: VillageScavengingData): void {
        this.logger.log(`=== SCAVENGING TIME DATA for ${villageScavengingData.villageName} ===`);
        for (const levelData of villageScavengingData.levels) {
            if (levelData.status === 'busy' && levelData.timeRemaining) {
                this.logger.log(`  Level ${levelData.level}: ${levelData.status} (${levelData.timeRemaining} remaining, ${levelData.timeRemainingSeconds}s)`);
                if (levelData.estimatedCompletionTime) {
                    this.logger.log(`    Estimated completion: ${levelData.estimatedCompletionTime.toLocaleString()}`);
                }
            } else if (levelData.status === 'unlocking' && levelData.timeRemaining) {
                this.logger.log(`  Level ${levelData.level}: ${levelData.status} (${levelData.timeRemaining} remaining)`);
            } else {
                this.logger.log(`  Level ${levelData.level}: ${levelData.status}`);
            }
        }
        this.logger.log(`=======================================`);
    }
} 