import { Logger } from '@nestjs/common';
import { Page } from 'playwright';
import { createBrowserPage } from '@/utils/browser.utils';
import { AuthUtils } from '@/utils/auth/auth.utils';
import { PlemionaCredentials } from '@/utils/auth/auth.interfaces';
import { ServersService } from '@/servers/servers.service';
import { PlemionaCookiesService } from '@/plemiona-cookies';
import { BarbarianVillagesService } from '@/barbarian-villages/barbarian-villages.service';
import { MiniAttackStrategiesService } from '@/mini-attack-strategies/mini-attack-strategies.service';

export interface ExecuteMiniAttacksTaskDependencies {
    miniAttackStrategiesService: MiniAttackStrategiesService;
    serversService: ServersService;
    barbarianVillagesService: BarbarianVillagesService;
    credentials: PlemionaCredentials;
    plemionaCookiesService: PlemionaCookiesService;
    logger: Logger;
}

/**
 * Executes mini attacks for a server
 * @param serverId ID of the server
 * @param deps Dependencies needed for execution
 */
export async function executeMiniAttacksTaskOperation(
    serverId: number,
    deps: ExecuteMiniAttacksTaskDependencies
): Promise<void> {
    const { miniAttackStrategiesService, serversService, barbarianVillagesService, credentials, plemionaCookiesService, logger } = deps;
    logger.log(`🚀 Executing mini attacks for server ${serverId}`);

    const browserPage = await createBrowserPage({ headless: true });
    const browser = browserPage.browser;
    const { page } = browserPage;

    try {
        // Get only active strategies for this server
        const strategies = await miniAttackStrategiesService.findActiveByServer(serverId);
        if (strategies.length === 0) {
            logger.warn(`⚠️ No active mini attack strategies found for server ${serverId}`);
            return;
        }

        logger.log(`📋 Found ${strategies.length} active strategies for server ${serverId}`);

        const serverName = await serversService.getServerName(serverId);
        const serverCode = await serversService.getServerCode(serverId);

        // 1. Login and select world
        const loginResult = await AuthUtils.loginAndSelectWorld(
            page,
            credentials,
            plemionaCookiesService,
            serverName
        );

        if (!loginResult.success || !loginResult.worldSelected) {
            throw new Error(`Login failed for server ${serverId}: ${loginResult.error || 'Unknown error'}`);
        }

        logger.log(`Successfully logged in for server ${serverId}, starting mini attacks...`);

        // Execute mini attacks for each strategy (village)
        for (const strategy of strategies) {
            logger.log(`🗡️ Executing mini attacks for village ${strategy.villageId} on server ${serverId}`);

            try {
                await barbarianVillagesService.executeMiniAttacks(serverId, strategy.villageId, page, serverCode, strategy);
                logger.log(`✅ Mini attacks completed for village ${strategy.villageId} on server ${serverId}`);
            } catch (villageError) {
                logger.error(`❌ Error executing mini attacks for village ${strategy.villageId} on server ${serverId}:`, villageError);
                // Continue with next village instead of stopping
            }
        }

        logger.log(`🎯 All mini attacks completed for server ${serverId}`);

    } catch (error) {
        logger.error(`❌ Error during mini attacks execution for server ${serverId}:`, error);
        throw error;
    } finally {
        await browser.close();
    }
}

