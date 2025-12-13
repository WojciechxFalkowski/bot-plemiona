import { Page } from 'playwright';
import { VillageResponseDto } from '@/villages/dto';
import { Logger } from '@nestjs/common';
import { ScavengingUtils } from '@/utils/scavenging/scavenging.utils';
import { ScavengeLevelStatus, LevelDispatchPlan, ScavengingTimeData } from '@/utils/scavenging/scavenging.interfaces';
import { AdvancedScavengingService } from '@/advanced-scavenging/advanced-scavenging.service';
import { ScavengingLimitsService } from '@/scavenging-limits/scavenging-limits.service';
import { levelSelectors, unitInputNames, unitOrder } from '../../../utils/scavenging.config';
import { updateVillageStateAfterDispatchOperation } from './update-village-state-after-dispatch.operation';

export interface ProcessVillageScavengingDependencies {
    page: Page;
    logger: Logger;
    advancedScavengingService: AdvancedScavengingService;
    scavengingLimitsService: ScavengingLimitsService;
    scavengingTimeData: ScavengingTimeData;
}

/**
 * Processes scavenging for a specific village
 * This is a complex operation that handles the full scavenging workflow
 * @param serverId ID of the server
 * @param village Village to process
 * @param serverCode Server code
 * @param deps Dependencies needed for processing
 * @returns Number of successful dispatches
 */
export async function processVillageScavengingOperation(
    serverId: number,
    village: VillageResponseDto,
    serverCode: string,
    deps: ProcessVillageScavengingDependencies
): Promise<number> {
    const { page, logger, advancedScavengingService, scavengingLimitsService, scavengingTimeData } = deps;

    try {
        // Nawigacja do zakładki Zbieractwo dla konkretnej wioski
        const scavengingUrl = `https://${serverCode}.plemiona.pl/game.php?village=${village.id}&screen=place&mode=scavenge`;
        logger.log(`Navigating to scavenging page for village ${village.name}: ${scavengingUrl}`);
        await page.goto(scavengingUrl, { waitUntil: 'networkidle', timeout: 15000 });
        logger.log(`Scavenging page loaded for village ${village.name}`);

        // Odczytaj dostępne jednostki w tej wiosce
        const availableUnits = await ScavengingUtils.getAvailableUnits(page);

        // Sprawdź status poziomów zbieractwa w tej wiosce
        const levelStatuses = await ScavengingUtils.getScavengingLevelStatuses(page);

        // Sprawdź, czy którykolwiek poziom zbieractwa jest zajęty
        const busyLevels = levelStatuses.filter(s => s.isBusy);
        if (busyLevels.length > 0) {
            logger.log(`Village ${village.name} has ${busyLevels.length} busy scavenging levels. Skipping.`);
            return 0;
        }

        // Kontynuuj tylko jeśli wszystkie poziomy zbieractwa są dostępne
        const freeLevels = levelStatuses.filter(s => s.isAvailable);

        if (freeLevels.length === 0) {
            logger.log(`No free scavenging levels available in village ${village.name}. Skipping.`);
            return 0;
        }

        logger.log(`Village ${village.name} has ${freeLevels.length} free levels: ${freeLevels.map(l => l.level).join(', ')}`);

        // Pobierz konfigurację włączonych jednostek dla wioski
        const villageUnitsConfig = await advancedScavengingService.getVillageUnitsConfig(serverId, village.id);
        const enabledUnits = villageUnitsConfig.units;

        // Pobierz limity dla wszystkich jednostek
        const unitLimits = await scavengingLimitsService.findByServerAndVillage(serverId, village.id);

        // Oblicz dystrybucję wojsk dla tej wioski
        const dispatchPlan = ScavengingUtils.calculateTroopDistribution(
            availableUnits,
            freeLevels,
            enabledUnits,
            unitLimits ? {
                maxSpearUnits: unitLimits.maxSpearUnits,
                maxSwordUnits: unitLimits.maxSwordUnits,
                maxAxeUnits: unitLimits.maxAxeUnits,
                maxArcherUnits: unitLimits.maxArcherUnits,
                maxLightUnits: unitLimits.maxLightUnits,
                maxMarcherUnits: unitLimits.maxMarcherUnits,
                maxHeavyUnits: unitLimits.maxHeavyUnits,
            } : undefined
        );

        if (!dispatchPlan || dispatchPlan.length === 0) {
            logger.log(`Could not calculate troop distribution for village ${village.name}. Skipping.`);
            return 0;
        }

        // Wypełnij formularze i wyloguj plan dystrybucji
        ScavengingUtils.logDispatchPlan(dispatchPlan, village.name);

        // Zapamiętaj oryginalny plan dla weryfikacji
        const originalDispatchPlan = JSON.parse(JSON.stringify(dispatchPlan));
        const failedDispatchLevels = new Map<number, LevelDispatchPlan>();

        // Wypełnij i wyślij każdy poziom po kolei
        logger.log(`=== ROUND 1: Starting scavenging missions for village ${village.name} ===`);
        let villageSuccessfulDispatches = 0;

        // Sortuj poziomy od najniższego do najwyższego
        const sortedPlans = [...dispatchPlan].sort((a, b) => a.level - b.level);

        for (const levelPlan of sortedPlans) {
            // ODŚWIEŻ STRONĘ PRZED KAŻDYM POZIOMEM - zapewnia świeże dane
            logger.debug(`Refreshing page before processing level ${levelPlan.level} in village ${village.name}...`);
            await page.reload({ waitUntil: 'networkidle', timeout: 15000 });
            await page.waitForTimeout(1000);
            
            // Upewnij się że kontenery poziomów są widoczne
            await page.waitForSelector(levelSelectors.levelContainerBase, { state: 'visible', timeout: 5000 });
            await page.waitForTimeout(500);

            // Retry logic - spróbuj maksymalnie 3 razy z opóźnieniem
            let levelStatus: ScavengeLevelStatus | undefined;
            let retryCount = 0;
            const maxRetries = 3;
            const retryDelay = 1500;

            while (retryCount < maxRetries && !levelStatus?.isAvailable) {
                if (retryCount > 0) {
                    logger.debug(`Retry ${retryCount}/${maxRetries - 1} checking level ${levelPlan.level} status in village ${village.name} after ${retryDelay}ms delay...`);
                    await page.waitForTimeout(retryDelay);
                }

                const currentStatuses = await ScavengingUtils.getScavengingLevelStatuses(page);
                levelStatus = currentStatuses.find(s => s.level === levelPlan.level);

                if (levelStatus?.isAvailable) {
                    break;
                }

                retryCount++;
            }

            if (!levelStatus || !levelStatus.isAvailable) {
                logger.warn(`Level ${levelPlan.level} is not available in village ${village.name} after ${maxRetries} attempts. Skipping.`);
                continue;
            }

            // Sprawdź, czy mamy jednostki do wysłania dla tego poziomu
            const hasUnitsToSend = Object.values(levelPlan.dispatchUnits).some(count => count > 0);
            if (!hasUnitsToSend) {
                logger.debug(`No units to send for level ${levelPlan.level} in village ${village.name}. Skipping.`);
                continue;
            }

            logger.log(`Processing level ${levelPlan.level} in village ${village.name}...`);

            await page.waitForTimeout(1000);

            // Wypełnij formularz dla tego poziomu
            const filledSuccessfully = await ScavengingUtils.fillUnitsForLevel(page, levelPlan, village.name);

            if (!filledSuccessfully) {
                logger.warn(`Could not fill all inputs for level ${levelPlan.level} in village ${village.name}. Skipping.`);
                continue;
            }

            // Kliknij Start dla tego poziomu
            try {
                // PRZED KLIKNIĘCIEM - upewnij się że mamy aktualny status poziomu
                const currentStatusesBeforeClick = await ScavengingUtils.getScavengingLevelStatuses(page);
                const levelStatusBeforeClick = currentStatusesBeforeClick.find(s => s.level === levelPlan.level);
                
                if (!levelStatusBeforeClick || !levelStatusBeforeClick.isAvailable) {
                    logger.warn(`Level ${levelPlan.level} became unavailable before clicking Start in village ${village.name}. Skipping.`);
                    continue;
                }

                const startButton = levelStatusBeforeClick.containerLocator.locator(levelSelectors.levelStartButton);

                if (await startButton.isVisible({ timeout: 2000 })) {
                    ScavengingUtils.logDispatchInfo(levelPlan, village.name);

                    // #region agent log
                    const formInputsBeforeClick = await Promise.all(unitOrder.map(async (unit) => {
                        const inputSelector = `input[name="${unitInputNames[unit]}"]`;
                        try {
                            const input = await page.locator(inputSelector).first();
                            const value = await input.inputValue().catch(() => null);
                            return { unit, value };
                        } catch {
                            return { unit, value: null };
                        }
                    }));
                    fetch('http://127.0.0.1:7243/ingest/00b63b23-f71f-4d89-a6c0-b08216483911',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'process-village-scavenging.operation.ts',message:'Form inputs BEFORE click',data:{level:levelPlan.level,formInputs:formInputsBeforeClick,expectedPlan:levelPlan.dispatchUnits},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
                    // #endregion

                    // Pobierz faktyczny czas trwania z interfejsu gry
                    let actualDurationSeconds = 0;
                    try {
                        const timeSelector = '.duration';
                        const timeElement = levelStatusBeforeClick.containerLocator.locator(timeSelector);

                        if (await timeElement.isVisible({ timeout: 2000 })) {
                            const durationText = await timeElement.textContent();
                            if (durationText) {
                                logger.log(`  * Faktyczny czas zbieractwa: ${durationText.trim()}`);
                                actualDurationSeconds = ScavengingUtils.parseTimeToSeconds(durationText.trim());
                            }
                        }
                    } catch (timeError) {
                        logger.log(`  * Błąd podczas odczytu czasu zbieractwa: ${timeError.message}`);
                    }

                    // #region agent log
                    fetch('http://127.0.0.1:7243/ingest/00b63b23-f71f-4d89-a6c0-b08216483911',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'process-village-scavenging.operation.ts',message:'BEFORE click Start',data:{level:levelPlan.level,villageName:village.name,dispatchUnits:levelPlan.dispatchUnits},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
                    // #endregion

                    await startButton.click();
                    logger.log(`Clicked Start for level ${levelPlan.level} in village ${village.name}`);

                    // #region agent log
                    fetch('http://127.0.0.1:7243/ingest/00b63b23-f71f-4d89-a6c0-b08216483911',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'process-village-scavenging.operation.ts',message:'AFTER click Start',data:{level:levelPlan.level},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
                    // #endregion

                    // Update village state using operation
                    updateVillageStateAfterDispatchOperation(
                        village.id,
                        levelPlan.level,
                        actualDurationSeconds,
                        {
                            scavengingTimeData,
                            logger
                        }
                    );

                    // CZEKAJ NA ZAKOŃCZENIE REQUESTA PO KLIKNIĘCIU
                    await page.waitForLoadState('networkidle', { timeout: 10000 });
                    await page.waitForTimeout(2000); // Daj więcej czasu na przetworzenie

                    // #region agent log
                    fetch('http://127.0.0.1:7243/ingest/00b63b23-f71f-4d89-a6c0-b08216483911',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'process-village-scavenging.operation.ts',message:'BEFORE reload verification',data:{level:levelPlan.level},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
                    // #endregion

                    // WERYFIKACJA: Sprawdź czy poziom faktycznie został wysłany
                    await page.waitForTimeout(2000); // Daj czas na aktualizację
                    await page.reload({ waitUntil: 'networkidle', timeout: 15000 });
                    await page.waitForTimeout(1000);
                    await page.waitForSelector(levelSelectors.levelContainerBase, { state: 'visible', timeout: 5000 });

                    const verificationStatuses = await ScavengingUtils.getScavengingLevelStatuses(page);
                    const verificationStatus = verificationStatuses.find(s => s.level === levelPlan.level);

                    // #region agent log
                    fetch('http://127.0.0.1:7243/ingest/00b63b23-f71f-4d89-a6c0-b08216483911',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'process-village-scavenging.operation.ts',message:'AFTER verification status check',data:{level:levelPlan.level,isBusy:verificationStatus?.isBusy,isAvailable:verificationStatus?.isAvailable,allStatuses:verificationStatuses.map(s=>({level:s.level,isBusy:s.isBusy,isAvailable:s.isAvailable}))},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
                    // #endregion

                    if (verificationStatus?.isBusy) {
                        logger.log(`✓ Level ${levelPlan.level} successfully dispatched (now busy)`);
                        villageSuccessfulDispatches++;
                    } else if (verificationStatus?.isAvailable) {
                        logger.warn(`✗ Level ${levelPlan.level} dispatch failed - still available. Adding to retry list.`);
                        failedDispatchLevels.set(levelPlan.level, levelPlan);
                    } else {
                        logger.warn(`? Level ${levelPlan.level} status unclear after dispatch. Adding to retry list.`);
                        failedDispatchLevels.set(levelPlan.level, levelPlan);
                    }
                    
                    await page.waitForTimeout(500);
                } else {
                    logger.warn(`Start button not visible for level ${levelPlan.level} in village ${village.name}, skipping dispatch.`);
                }
            } catch (clickError) {
                logger.error(`Error in scavenging for level ${levelPlan.level} in village ${village.name}:`, clickError);
                // Jeśli wystąpił błąd, odśwież stronę przed następnym poziomem
                try {
                    await page.reload({ waitUntil: 'networkidle', timeout: 15000 });
                    await page.waitForTimeout(1000);
                } catch (reloadError) {
                    logger.error(`Error refreshing page after error:`, reloadError);
                }
            }
        }

        // RUNDA 2: Ponowne wysłanie brakujących poziomów
        if (failedDispatchLevels.size > 0) {
            logger.log(`=== ROUND 2: Retrying ${failedDispatchLevels.size} failed dispatches for village ${village.name} ===`);
            
            // Odśwież stronę przed rundą 2
            await page.reload({ waitUntil: 'networkidle', timeout: 15000 });
            await page.waitForTimeout(1000);
            await page.waitForSelector(levelSelectors.levelContainerBase, { state: 'visible', timeout: 5000 });
            
            // Sprawdź aktualny status wszystkich poziomów
            const round2Statuses = await ScavengingUtils.getScavengingLevelStatuses(page);
            const availableLevels = round2Statuses.filter(s => s.isAvailable);
            
            logger.log(`Round 2: Found ${availableLevels.length} available levels in village ${village.name}`);
            
            // Sortuj poziomy od najniższego
            const sortedFailedPlans = Array.from(failedDispatchLevels.entries())
                .sort((a, b) => a[0] - b[0]);
            
            for (const [level, levelPlan] of sortedFailedPlans) {
                const levelStatus = availableLevels.find(s => s.level === level);
                
                if (!levelStatus || !levelStatus.isAvailable) {
                    logger.warn(`Round 2: Level ${level} is no longer available in village ${village.name}. Skipping.`);
                    continue;
                }
                
                logger.log(`Round 2: Retrying dispatch for level ${level} in village ${village.name}...`);
                
                // Wypełnij formularz
                const filledSuccessfully = await ScavengingUtils.fillUnitsForLevel(page, levelPlan, village.name);
                
                if (!filledSuccessfully) {
                    logger.warn(`Round 2: Could not fill inputs for level ${level}. Skipping.`);
                    continue;
                }
                
                // Kliknij Start
                try {
                    const startButton = levelStatus.containerLocator.locator(levelSelectors.levelStartButton);
                    
                    if (await startButton.isVisible({ timeout: 2000 })) {
                        await startButton.click();
                        logger.log(`Round 2: Clicked Start for level ${level} in village ${village.name}`);
                        
                        // Weryfikacja sukcesu
                        await page.waitForLoadState('networkidle', { timeout: 10000 });
                        await page.waitForTimeout(2000);
                        await page.reload({ waitUntil: 'networkidle', timeout: 15000 });
                        await page.waitForTimeout(1000);
                        await page.waitForSelector(levelSelectors.levelContainerBase, { state: 'visible', timeout: 5000 });
                        
                        const finalStatuses = await ScavengingUtils.getScavengingLevelStatuses(page);
                        const finalStatus = finalStatuses.find(s => s.level === level);
                        
                        if (finalStatus?.isBusy) {
                            logger.log(`Round 2: ✓ Level ${level} successfully dispatched`);
                            villageSuccessfulDispatches++;
                        } else {
                            logger.warn(`Round 2: ✗ Level ${level} still failed after retry`);
                        }
                        
                        await page.waitForTimeout(1000);
                    }
                } catch (round2Error) {
                    logger.error(`Round 2: Error dispatching level ${level}:`, round2Error);
                }
            }
            
            logger.log(`=== Round 2 completed for village ${village.name} ===`);
        }

        return villageSuccessfulDispatches;
    } catch (error) {
        logger.error(`Error processing scavenging for village ${village.name}:`, error);
        return 0;
    }
}
