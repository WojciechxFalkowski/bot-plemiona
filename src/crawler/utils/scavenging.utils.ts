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
            const isLocked = await container.locator(levelSelectors.levelUnlockButton).isVisible({ timeout: 1000 }); // Krótki timeout

            // Sprawdź, czy poziom jest w trakcie odblokowywania
            const isUnlocking = await container.locator('.unlocking-view').isVisible({ timeout: 1000 });

            // Sprawdź, czy poziom ma przycisk Start (jest potencjalnie dostępny)
            const hasStartButton = await container.locator(levelSelectors.levelStartButton).isVisible({ timeout: 1000 }); // Krótki timeout

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
            this.logger.debug(`Level ${level} status: Locked=${isLocked}, Unlocking=${isUnlocking}, Busy=${isBusy}, Available=${isAvailable} (Start button found: ${hasStartButton})`);
        }

        // Zwróć statusy (maksymalnie 4)
        return statuses;
    }

    /**
     * Odczytuje liczbę dostępnych jednostek.
     */
    static async getAvailableUnits(page: Page): Promise<Partial<Record<ScavengingUnit, number>>> {
        const units: Partial<Record<ScavengingUnit, number>> = {};
        this.logger.debug('Reading available unit counts...');

        for (const unit of unitOrder) {
            try {
                const selector = availableUnitSelectors[unit];
                const unitElement = page.locator(selector);

                // Sprawdź, czy element istnieje i jest widoczny, zanim spróbujesz odczytać tekst
                if (await unitElement.isVisible({ timeout: 5000 })) { // Krótki timeout na sprawdzenie widoczności
                    const countText = await unitElement.textContent(); // Odczytaj tekst np. "(203)"
                    const match = countText?.match(/\((\d+)\)/); // Wyciągnij liczbę z nawiasów
                    units[unit] = match ? parseInt(match[1], 10) : 0;
                    this.logger.debug(`Found unit ${unit}: ${units[unit]}`);
                } else {
                    this.logger.debug(`Unit element not visible for: ${unit} using selector ${selector}`);
                    units[unit] = 0; // Jeśli element niewidoczny, załóż 0
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
        return units;
    }

    /**
     * Oblicza dystrybucję wojsk na dostępne poziomy.
     */
    static calculateTroopDistribution(
        availableUnits: Partial<Record<ScavengingUnit, number>>,
        freeLevels: ScavengeLevelStatus[]
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

        const unitsToSendTotal: Partial<Record<ScavengingUnit, number>> = {};

        // Wysyłaj wszystkie dostępne jednostki
        for (const unit of unitOrder) {
            let available = availableUnits[unit] || 0;
            unitsToSendTotal[unit] = available;
        }
        this.logger.debug('Total units eligible for sending (after limits):', unitsToSendTotal);

        // Rozdziel jednostki proporcjonalnie na poziomy
        for (const levelStatus of eligibleLevels) {
            const level = levelStatus.level;
            const levelPack = levelPacks[level];
            const plan = dispatchPlan.find(p => p.level === level);
            if (!plan) continue;

            for (const unit of unitOrder) {
                if (!unitsToSendTotal[unit] || unitsToSendTotal[unit] === 0) continue;

                const countForLevel = Math.floor((unitsToSendTotal[unit] * levelPack) / totalPacks);
                plan.dispatchUnits[unit] = countForLevel;
            }
        }

        // Zastosuj limit max_resources dla każdego poziomu osobno
        for (const plan of dispatchPlan) {
            let currentCapacity = 0;
            for (const unit of unitOrder) {
                if (plan.dispatchUnits[unit]) {
                    currentCapacity += plan.dispatchUnits[unit] * unitSettings[unit].capacity;
                }
            }

            let levelMaxResources = scavengingSettings.max_resources;
            // Dostosuj max_resources dla poziomu (logika z JS)
            if (eligibleLevels.length === 1) levelMaxResources *= 10;
            else if (eligibleLevels.length === 2) levelMaxResources *= 4;
            else if (eligibleLevels.length === 3) levelMaxResources *= 2;
            else levelMaxResources *= 1.3333;

            if (currentCapacity > levelMaxResources) {
                const ratio = levelMaxResources / currentCapacity;
                this.logger.debug(`Level ${plan.level} capacity ${currentCapacity} exceeds limit ${levelMaxResources}. Applying ratio ${ratio}.`);
                for (const unit of unitOrder) {
                    if (plan.dispatchUnits[unit]) {
                        plan.dispatchUnits[unit] = Math.floor(plan.dispatchUnits[unit] * ratio);
                    }
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
                        this.logger.debug(`Could not read unlock time for level ${levelStatus.level}: ${error.message}`);
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
                        this.logger.debug(`Could not read remaining time for busy level ${levelStatus.level}: ${error.message}`);
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
                // Wioska ma dostępne poziomy - bot może od razu wysłać wojska (czas = 0)
                maxTimesPerVillage.push(0);
                this.logger.debug(`Village ${village.villageName} has available levels - set to 0s (ready to dispatch)`);
            } else {
                // Wioska ma wszystkie poziomy zablokowane lub w trakcie odblokowywania - ustaw infinite
                maxTimesPerVillage.push(Number.MAX_SAFE_INTEGER);
                this.logger.debug(`Village ${village.villageName} has no busy/available levels (${lockedLevels.length} locked, ${unlockingLevels.length} unlocking) - set to infinite`);
            }
        }

        // Znajdź najkrótszy z najdłuższych czasów (ignoruj infinite)
        const finiteMaxTimes = maxTimesPerVillage.filter(time => time !== Number.MAX_SAFE_INTEGER);

        if (finiteMaxTimes.length === 0) {
            // Wszystkie wioski mają infinite - brak dostępnych/aktywnych poziomów
            this.logger.debug('All villages have infinite time (no busy/available levels)');
            return null;
        }

        const shortestMaxTime = Math.min(...finiteMaxTimes);
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