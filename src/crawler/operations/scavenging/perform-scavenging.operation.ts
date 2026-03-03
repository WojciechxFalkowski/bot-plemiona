import { Logger } from '@nestjs/common';
import { Browser } from 'playwright';
import { createBrowserPage } from '../../../utils/browser.utils';
import { AuthUtils } from '@/utils/auth/auth.utils';
import { PlemionaCredentials } from '@/utils/auth/auth.interfaces';
import { PlemionaCookiesService } from '@/plemiona-cookies';
import { VillagesService } from '@/villages/villages.service';
import { VillageResponseDto } from '@/villages/dto';
import { ServersService } from '@/servers';
import { AdvancedScavengingService } from '@/advanced-scavenging/advanced-scavenging.service';
import { ScavengingLimitsService } from '@/scavenging-limits/scavenging-limits.service';
import { ScavengingTimeData, VillageScavengingData } from '@/utils/scavenging/scavenging.interfaces';
import { ScavengingUtils } from '@/utils/scavenging/scavenging.utils';
import { SettingsService } from '../../../settings/settings.service';
import { unitOrder } from '../../../utils/scavenging.config';
import { validateAutoScavengingEnabledOperation } from '../validation/validate-auto-scavenging-enabled.operation';
import { collectScavengingTimeDataOperation } from './collect-scavenging-time-data.operation';
import { processVillageScavengingOperation } from './process-village-scavenging.operation';
import { CrawlerActivityEventType } from '@/crawler-activity-logs/entities/crawler-activity-log.entity';
import { handleCrawlerErrorOperation } from '../utils/handle-crawler-error.operation';

export interface ScavengingActivityContext {
    executionLogId: number | null;
    serverId: number;
    logActivity: (evt: { eventType: CrawlerActivityEventType; message: string }) => Promise<void>;
    onRecaptchaBlocked?: (serverId: number) => void;
}

export interface PerformScavengingDependencies {
    logger: Logger;
    credentials: PlemionaCredentials;
    plemionaCookiesService: PlemionaCookiesService;
    villagesService: VillagesService;
    serversService: ServersService;
    advancedScavengingService: AdvancedScavengingService;
    scavengingLimitsService: ScavengingLimitsService;
    settingsService: SettingsService;
    scavengingTimeData: ScavengingTimeData;
    activityContext?: ScavengingActivityContext;
}

/**
 * Wykonuje cykl zbieractwa: nawigacja, analiza, dystrybucja, logowanie planu i planowanie.
 * Iteruje po wszystkich wioskach i wysyła wojsko na odprawy.
 * Loguje się tylko raz na początku dla wszystkich wiosek.
 * @param serverId ID serwera
 * @param deps Dependencies needed for execution
 */
export async function performScavengingOperation(
    serverId: number,
    deps: PerformScavengingDependencies
): Promise<void> {
    const {
        logger,
        credentials,
        plemionaCookiesService,
        villagesService,
        serversService,
        advancedScavengingService,
        scavengingLimitsService,
        settingsService,
        scavengingTimeData,
        activityContext
    } = deps;

    let browser: Browser | null = null;

    try {
        logger.log('Starting scavenging process for villages with auto-scavenging enabled...');

        // 1. Sprawdź czy scavenging jest włączony dla serwera
        const isScavengingEnabled = await validateAutoScavengingEnabledOperation(serverId, {
            settingsService,
            logger
        });
        if (!isScavengingEnabled) {
            logger.warn(`⚠️ Auto-scavenging is disabled for server ${serverId}. Cannot perform scavenging.`);
            return;
        }

        // 2. Pobierz wioski z bazy danych które mają włączone auto-scavenging
        let villages: VillageResponseDto[] = [];
        try {
            const allVillages = await villagesService.findAll(serverId, false); // false = bez auto-refresh

            // Log all villages with their auto-scavenging status
            const enabledVillages = allVillages.filter(v => v.isAutoScavengingEnabled);
            const disabledVillages = allVillages.filter(v => !v.isAutoScavengingEnabled);

            logger.log(`Villages auto-scavenging status:`);
            logger.log(`  ✓ ENABLED (${enabledVillages.length}): ${enabledVillages.map(v => v.name).join(', ') || 'none'}`);
            logger.log(`  ✗ DISABLED (${disabledVillages.length}): ${disabledVillages.map(v => v.name).join(', ') || 'none'}`);

            villages = enabledVillages;

            if (!villages || villages.length === 0) {
                logger.warn('No villages with auto-scavenging enabled found. Cannot perform scavenging.');
                return;
            }
            logger.log(`Found ${villages.length} villages with auto-scavenging enabled to process`);
        } catch (villageError) {
            logger.error('Error fetching villages from database:', villageError);
            throw villageError; // Let orchestrator handle the error
        }

        // 3. Teraz dopiero otwórz przeglądarkę i zaloguj użytkownika
        const headless = process.env.NODE_ENV === 'production';
        const browserPage = await createBrowserPage({ headless });
        browser = browserPage.browser;
        const { page } = browserPage;

        try {
            const serverName = await serversService.getServerName(serverId);
            const serverCode = await serversService.getServerCode(serverId);

            logger.log(`🔐 Logging in to server ${serverName} (${serverCode})...`);
            const loginResult = await AuthUtils.loginAndSelectWorld(
                page,
                credentials,
                plemionaCookiesService,
                serverName
            );

            if (!loginResult.success || !loginResult.worldSelected) {
                const classification = await handleCrawlerErrorOperation(page, page.url(), {
                    serverId,
                    operationType: 'Scavenging',
                    logActivity: activityContext?.logActivity,
                    onRecaptchaBlocked: activityContext?.onRecaptchaBlocked,
                    errorMessage: `Nie udało się zalogować do Plemion: ${loginResult.error || 'nieznany błąd'}`
                });
                if (classification === 'recaptcha_blocked') {
                    throw new Error('reCAPTCHA wymaga odblokowania');
                }
                throw new Error(`Login failed for server ${serverCode}: ${loginResult.error || 'Unknown error'}`);
            }

            logger.log(`✅ Successfully logged in to server ${serverCode}`);

            // Zresetuj dane o czasach scavenging przed rozpoczęciem nowego cyklu
            scavengingTimeData.lastCollected = new Date();
            scavengingTimeData.villages = [];

            // PRE-FILTERING: Sprawdź status scavenging dla wiosek z włączonym auto-scavenging
            logger.log('=== PRE-FILTERING PHASE: Collecting data for auto-scavenging enabled villages ===');
            const villagesToProcess: VillageResponseDto[] = [];

            for (let i = 0; i < villages.length; i++) {
                const village = villages[i];
                logger.log(`Pre-filtering village data for village ${i + 1}/${villages.length}: ${village.name} (ID: ${village.id})`);

                try {
                    // Nawigacja do zakładki Zbieractwo dla sprawdzenia statusu
                    const scavengingUrl = `https://${serverCode}.plemiona.pl/game.php?village=${village.id}&screen=place&mode=scavenge`;
                    await page.goto(scavengingUrl, { waitUntil: 'networkidle', timeout: 15000 });

                    // Zbierz dane o czasach scavenging dla tej wioski (delegates to operation)
                    const villageScavengingData = await collectScavengingTimeDataOperation(
                        village.id,
                        village.name,
                        { page }
                    );
                    scavengingTimeData.villages.push(villageScavengingData);

                    // Wyloguj zebrane dane o czasach
                    ScavengingUtils.logScavengingTimeData(villageScavengingData);

                    // Sprawdź czy wioska ma dostępne poziomy zbieractwa
                    const levelStatuses = await ScavengingUtils.getScavengingLevelStatuses(page);
                    const freeLevels = levelStatuses.filter(s => s.isAvailable);
                    const busyLevels = levelStatuses.filter(s => s.isBusy);
                    const lockedLevels = levelStatuses.filter(s => s.isLocked);
                    const unlockingLevels = levelStatuses.filter(s => s.isUnlocking);

                    if (freeLevels.length > 0) {
                        // Sprawdź czy wioska ma jednostki do wysłania
                        const availableUnits = await ScavengingUtils.getAvailableUnits(page);

                        // Pobierz konfigurację włączonych jednostek dla wioski
                        const villageUnitsConfig = await advancedScavengingService.getVillageUnitsConfig(serverId, village.id);
                        const enabledUnits = villageUnitsConfig.units;

                        // Sprawdź czy przynajmniej jedna włączona jednostka jest dostępna
                        const hasAvailableEnabledUnits = unitOrder.some(unit =>
                            enabledUnits[unit] && (availableUnits[unit] || 0) > 0
                        );

                        if (hasAvailableEnabledUnits) {
                            const enabledUnitsList = unitOrder.filter(unit => enabledUnits[unit] && (availableUnits[unit] || 0) > 0);
                            const unitsString = enabledUnitsList.map(unit => `${unit}=${availableUnits[unit]}`).join(', ');
                            logger.log(`✓ Village ${village.name} added to processing queue (${freeLevels.length} free levels, enabled units: ${unitsString})`);
                            villagesToProcess.push(village);
                        } else {
                            logger.log(`✗ Village ${village.name} skipped - no enabled units available`);
                        }
                    } else {
                        // Sprawdź czy to rzeczywiście "wszystkie sloty zablokowane" czy błąd pobierania danych
                        if (levelStatuses.length === 0) {
                            // Błąd: nie znaleziono żadnych kontenerów - może być reCAPTCHA lub błąd pobierania danych
                            logger.warn(
                                `⚠️ Village ${village.name} - data collection error: no level containers found. ` +
                                `Will retry with short interval.`
                            );
                            const classification = await handleCrawlerErrorOperation(page, page.url(), {
                                serverId,
                                operationType: 'Scavenging',
                                logActivity: activityContext?.logActivity,
                                onRecaptchaBlocked: activityContext?.onRecaptchaBlocked,
                                errorMessage: `Błąd pre-filteringu (brak kontenerów poziomów) wioski ${village.name}`
                            });
                            if (classification === 'recaptcha_blocked') {
                                throw new Error(`reCAPTCHA detected when no level containers found for village ${village.name}`);
                            }
                            // Nadpisz dane wioski pustymi levels aby oznaczyć błąd
                            const villageDataIndex = scavengingTimeData.villages.findIndex(
                                v => v.villageId === village.id
                            );
                            if (villageDataIndex >= 0) {
                                scavengingTimeData.villages[villageDataIndex].levels = [];
                            }
                            logger.log(`✗ Village ${village.name} skipped - data collection error (will retry shortly)`);
                        } else if (lockedLevels.length === levelStatuses.length && levelStatuses.length === 4) {
                            // Normalna sytuacja: wszystkie 4 sloty są zablokowane
                            logger.log(
                                `✗ Village ${village.name} skipped - all ${lockedLevels.length} levels locked (normal state)`
                            );
                        } else {
                            // Błąd: nieprawidłowa liczba poziomów (powinno być 4) lub mieszany stan
                            logger.warn(
                                `⚠️ Village ${village.name} - unexpected state: ${levelStatuses.length} levels found ` +
                                `(${busyLevels.length} busy, ${freeLevels.length} free, ${lockedLevels.length} locked, ${unlockingLevels.length} unlocking). ` +
                                `Expected 4 locked levels. Will retry with short interval.`
                            );
                            const classification = await handleCrawlerErrorOperation(page, page.url(), {
                                serverId,
                                operationType: 'Scavenging',
                                logActivity: activityContext?.logActivity,
                                onRecaptchaBlocked: activityContext?.onRecaptchaBlocked,
                                errorMessage: `Błąd pre-filteringu (nieoczekiwany stan poziomów) wioski ${village.name}`
                            });
                            if (classification === 'recaptcha_blocked') {
                                throw new Error(`reCAPTCHA detected for village ${village.name} (unexpected level state)`);
                            }
                            // Nadpisz dane wioski pustymi levels aby oznaczyć błąd
                            const villageDataIndex = scavengingTimeData.villages.findIndex(
                                v => v.villageId === village.id
                            );
                            if (villageDataIndex >= 0) {
                                scavengingTimeData.villages[villageDataIndex].levels = [];
                            }
                            logger.log(`✗ Village ${village.name} skipped - data collection error (will retry shortly)`);
                        }
                    }

                    // Małe opóźnienie między wioskami
                    if (i < villages.length - 1) {
                        await page.waitForTimeout(1000);
                    }

                } catch (villageError) {
                    const errorMsg = villageError instanceof Error ? villageError.message : String(villageError);
                    logger.error(`Error during pre-filtering for village ${village.name}:`, villageError);
                    const classification = await handleCrawlerErrorOperation(page, await page.url(), {
                        serverId,
                        operationType: 'Scavenging',
                        logActivity: activityContext?.logActivity,
                        onRecaptchaBlocked: activityContext?.onRecaptchaBlocked,
                        errorMessage: `Błąd pre-filteringu wioski ${village.name}: ${errorMsg}`
                    });
                    if (classification === 'recaptcha_blocked') {
                        throw villageError;
                    }
                    scavengingTimeData.villages.push({
                        villageId: village.id,
                        villageName: village.name,
                        lastUpdated: new Date(),
                        levels: [] // Puste poziomy oznaczają błąd podczas zbierania danych
                    });
                }
            }

            logger.log(`=== Pre-filtering completed. ${villagesToProcess.length}/${villages.length} villages selected for processing ===`);

            if (villagesToProcess.length === 0) {
                logger.log('No villages require scavenging. All villages are either busy or have no units.');
                return;
            }

            // DISPATCH PHASE: Teraz przetwarzaj tylko wioski które mają dostępne poziomy i auto-scavenging włączony
            logger.log('=== DISPATCH PHASE: Processing selected villages ===');
            let totalSuccessfulDispatches = 0;

            for (let i = 0; i < villagesToProcess.length; i++) {
                const village = villagesToProcess[i];
                logger.log(`Processing scavenging for village ${i + 1}/${villagesToProcess.length}: ${village.name} (ID: ${village.id})`);

                try {
                    // Delegate to operation
                    const dispatchedCount = await processVillageScavengingOperation(
                        serverId,
                        village,
                        serverCode,
                        {
                            page,
                            logger,
                            advancedScavengingService,
                            scavengingLimitsService,
                            scavengingTimeData,
                            activityContext
                        }
                    );
                    totalSuccessfulDispatches += dispatchedCount;

                    if (dispatchedCount > 0) {
                        logger.log(`Successfully dispatched ${dispatchedCount} scavenging missions from village ${village.name}.`);
                    } else {
                        logger.log(`No scavenging missions were dispatched from village ${village.name}.`);
                    }

                    // Sprawdź czy sesja wygasła (użytkownik zalogował się) - przerwij pętlę
                    const checkUrl = await page.url();
                    const checkClassification = await handleCrawlerErrorOperation(page, checkUrl, {
                        serverId,
                        operationType: 'Scavenging',
                        logActivity: activityContext?.logActivity,
                        onRecaptchaBlocked: activityContext?.onRecaptchaBlocked
                    });
                    if (checkClassification === 'session_expired' || checkClassification === 'recaptcha_blocked') {
                        if (checkClassification === 'recaptcha_blocked') {
                            throw new Error('reCAPTCHA wymaga odblokowania');
                        }
                        break;
                    }

                    // Małe opóźnienie między wioskami aby nie przeciążać serwera
                    if (i < villagesToProcess.length - 1) {
                        await page.waitForTimeout(2000);
                    }

                } catch (villageError) {
                    const errorMsg = villageError instanceof Error ? villageError.message : String(villageError);
                    logger.error(`Error processing scavenging for village ${village.name}:`, villageError);
                    const classification = await handleCrawlerErrorOperation(page, await page.url(), {
                        serverId,
                        operationType: 'Scavenging',
                        logActivity: activityContext?.logActivity,
                        onRecaptchaBlocked: activityContext?.onRecaptchaBlocked,
                        errorMessage: `Błąd wysyłania zbieractwa z wioski ${village.name}: ${errorMsg}`
                    });
                    if (classification === 'recaptcha_blocked') {
                        throw villageError;
                    }
                    continue;
                }
            }

            // Podsumowanie dla wszystkich wiosek
            if (totalSuccessfulDispatches > 0) {
                logger.log(`=== SCAVENGING SUMMARY ===`);
                logger.log(`Successfully dispatched ${totalSuccessfulDispatches} scavenging missions across ${villagesToProcess.length} villages.`);
                logger.log(`========================`);
            } else {
                logger.log(`=== SCAVENGING SUMMARY ===`);
                logger.log(`No scavenging missions were dispatched across ${villagesToProcess.length} villages.`);
                logger.log(`========================`);
            }

            // Scavenging completed - orchestrator will handle scheduling

        } catch (error) {
            logger.error('Error during scavenging process:', error);
            throw error; // Let orchestrator handle the error
        }
    } catch (error) {
        logger.error('Error during scavenging process:', error);
        throw error; // Let orchestrator handle the error
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

