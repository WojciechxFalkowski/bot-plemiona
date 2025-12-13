import { Logger } from '@nestjs/common';
import { Browser } from 'playwright';
import { createBrowserPage } from '../../../utils/browser.utils';
import { AuthUtils } from '@/utils/auth/auth.utils';
import { PlemionaCredentials } from '@/utils/auth/auth.interfaces';
import { PlemionaCookiesService } from '@/plemiona-cookies';
import { VillagesService } from '@/villages/villages.service';
import { ServersService } from '@/servers';
import { AdvancedScavengingService } from '@/advanced-scavenging/advanced-scavenging.service';
import { ScavengingLimitsService } from '@/scavenging-limits/scavenging-limits.service';
import { ScavengingTimeData } from '@/utils/scavenging/scavenging.interfaces';
import { processVillageScavengingOperation } from './process-village-scavenging.operation';

export interface PerformScavengingForVillageDependencies {
    logger: Logger;
    credentials: PlemionaCredentials;
    plemionaCookiesService: PlemionaCookiesService;
    villagesService: VillagesService;
    serversService: ServersService;
    advancedScavengingService: AdvancedScavengingService;
    scavengingLimitsService: ScavengingLimitsService;
    scavengingTimeData: ScavengingTimeData;
}

/**
 * Wykonuje zbieractwo dla konkretnej wioski
 * @param serverId ID serwera
 * @param villageId ID wioski
 * @param deps Dependencies needed for execution
 * @returns Result with success status, message and dispatched count
 */
export async function performScavengingForVillageOperation(
    serverId: number,
    villageId: string,
    deps: PerformScavengingForVillageDependencies
): Promise<{ success: boolean; message: string; dispatchedCount: number }> {
    const {
        logger,
        credentials,
        plemionaCookiesService,
        villagesService,
        serversService,
        advancedScavengingService,
        scavengingLimitsService,
        scavengingTimeData
    } = deps;

    let browser: Browser | null = null;

    try {
        logger.log(`Starting manual scavenging for village ${villageId} on server ${serverId}...`);

        // 1. Pobierz wioskę z bazy danych
        const village = await villagesService.findById(serverId, villageId);
        if (!village) {
            throw new Error(`Village ${villageId} not found on server ${serverId}`);
        }

        // 2. Sprawdź czy scavenging jest włączony dla wioski (dla ręcznego wyzwalania nie sprawdzamy ustawienia serwera)
        if (!village.isAutoScavengingEnabled) {
            throw new Error(`Auto-scavenging is disabled for village ${village.name} (${villageId})`);
        }

        // 3. Otwórz przeglądarkę i zaloguj użytkownika
        const browserPage = await createBrowserPage({ headless: true });
        browser = browserPage.browser;
        const { page } = browserPage;

        try {
            const serverCode = await serversService.getServerCode(serverId);
            const serverName = await serversService.getServerName(serverId);

            logger.log(`🔐 Logging in to server ${serverName} (${serverCode})...`);
            const loginResult = await AuthUtils.loginAndSelectWorld(
                page,
                credentials,
                plemionaCookiesService,
                serverName
            );

            if (!loginResult.success) {
                throw new Error(`Failed to login: ${loginResult.error}`);
            }

            logger.log(`✅ Successfully logged in to server ${serverName}`);

            // 4. Delegate to operation for processing village
            const villageSuccessfulDispatches = await processVillageScavengingOperation(
                serverId,
                village,
                serverCode,
                {
                    page,
                    logger,
                    advancedScavengingService,
                    scavengingLimitsService,
                    scavengingTimeData
                }
            );

            if (villageSuccessfulDispatches > 0) {
                logger.log(`Successfully dispatched ${villageSuccessfulDispatches} scavenging missions from village ${village.name}.`);
                return {
                    success: true,
                    message: `Successfully dispatched ${villageSuccessfulDispatches} scavenging missions from village ${village.name}`,
                    dispatchedCount: villageSuccessfulDispatches
                };
            } else {
                return {
                    success: false,
                    message: `No scavenging missions were dispatched from village ${village.name}`,
                    dispatchedCount: 0
                };
            }
        } finally {
            if (browser) {
                await browser.close();
            }
        }
    } catch (error) {
        logger.error(`Error during manual scavenging for village ${villageId}:`, error);
        throw error;
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

