import { Logger } from '@nestjs/common';
import { Page } from 'playwright';
import { createBrowserPage } from '@/utils/browser.utils';
import { AuthUtils } from '@/utils/auth/auth.utils';
import { PlemionaCredentials } from '@/utils/auth/auth.interfaces';
import { ServersService } from '@/servers/servers.service';
import { PlemionaCookiesService } from '@/plemiona-cookies';
import { BarbarianVillagesService } from '@/barbarian-villages/barbarian-villages.service';
import { MiniAttackStrategiesService } from '@/mini-attack-strategies/mini-attack-strategies.service';
import { CrawlerActivityLogsService } from '@/crawler-activity-logs/crawler-activity-logs.service';
import { CrawlerActivityEventType } from '@/crawler-activity-logs/entities/crawler-activity-log.entity';
import { CrawlerStatusService } from '@/crawler/crawler-status.service';
import { handleCrawlerErrorOperation } from '../utils/handle-crawler-error.operation';

export interface ExecuteMiniAttacksTaskDependencies {
    miniAttackStrategiesService: MiniAttackStrategiesService;
    serversService: ServersService;
    barbarianVillagesService: BarbarianVillagesService;
    credentials: PlemionaCredentials;
    plemionaCookiesService: PlemionaCookiesService;
    logger: Logger;
    executionLogId?: number | null;
    crawlerActivityLogsService?: CrawlerActivityLogsService;
    crawlerStatusService?: CrawlerStatusService;
}

function buildErrorContext(serverId: number, deps: ExecuteMiniAttacksTaskDependencies) {
    const { executionLogId, crawlerActivityLogsService, crawlerStatusService } = deps;
    return {
        serverId,
        operationType: 'Mini Attacks',
        logActivity:
            executionLogId != null && crawlerActivityLogsService
                ? async (evt: { eventType: CrawlerActivityEventType; message: string }) =>
                      crawlerActivityLogsService.logActivity({
                          executionLogId: executionLogId!,
                          serverId,
                          operationType: 'Mini Attacks',
                          eventType: evt.eventType,
                          message: evt.message
                      })
                : undefined,
        onRecaptchaBlocked: crawlerStatusService ? (id) => crawlerStatusService.markRecaptchaBlocked(id) : undefined
    };
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
            const errorContext = buildErrorContext(serverId, deps);
            const classification = await handleCrawlerErrorOperation(page, page.url(), {
                ...errorContext,
                errorMessage: `Nie udało się zalogować do Plemion: ${loginResult.error || 'nieznany błąd'}`
            });
            if (classification === 'recaptcha_blocked') {
                throw new Error('reCAPTCHA wymaga odblokowania');
            }
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
                const errorMsg = villageError instanceof Error ? villageError.message : String(villageError);
                logger.error(`❌ Error executing mini attacks for village ${strategy.villageId} on server ${serverId}:`, villageError);

                const errorContext = buildErrorContext(serverId, deps);
                const classification = await handleCrawlerErrorOperation(page, await page.url(), {
                    ...errorContext,
                    errorMessage: `Błąd mini-ataków dla wioski ${strategy.villageId}: ${errorMsg}`
                });
                if (classification === 'recaptcha_blocked') {
                    throw villageError;
                }
            }
        }

        logger.log(`🎯 All mini attacks completed for server ${serverId}`);

    } catch (error) {
        const errorContext = buildErrorContext(serverId, deps);
        const errorMsg = error instanceof Error ? error.message : String(error);
        const classification = await handleCrawlerErrorOperation(page, await page.url(), {
            ...errorContext,
            errorMessage: `Błąd wykonania mini-ataków: ${errorMsg}`
        });
        if (classification === 'recaptcha_blocked') {
            throw error;
        }
        throw error;
    } finally {
        await browser.close();
    }
}

