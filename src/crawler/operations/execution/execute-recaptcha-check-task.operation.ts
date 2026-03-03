import { Logger } from '@nestjs/common';
import { createBrowserPage } from '@/utils/browser.utils';
import { AuthUtils } from '@/utils/auth/auth.utils';
import { PlemionaCredentials } from '@/utils/auth/auth.interfaces';
import { ServersService } from '@/servers/servers.service';
import { PlemionaCookiesService } from '@/plemiona-cookies';
import { CrawlerStatusService, RECAPTCHA_CHECK_INTERVAL_MS } from '@/crawler/crawler-status.service';
import { CrawlerActivityLogsService } from '@/crawler-activity-logs/crawler-activity-logs.service';
import { CrawlerActivityEventType } from '@/crawler-activity-logs/entities/crawler-activity-log.entity';
import { classifyCrawlerErrorOperation } from '../utils/classify-crawler-error.operation';
import { resetServerPlanExecutionTimesOperation } from '../scheduling/reset-server-plan-execution-times.operation';

export interface ExecuteRecaptchaCheckTaskDependencies {
    serverId: number;
    credentials: PlemionaCredentials;
    plemionaCookiesService: PlemionaCookiesService;
    serversService: ServersService;
    crawlerStatusService: CrawlerStatusService;
    crawlerActivityLogsService: CrawlerActivityLogsService;
    multiServerState: import('../query/get-multi-server-status.operation').MultiServerState;
    logger: Logger;
    executionLogId?: number | null;
}

async function handleRecaptchaStillBlocked(
    deps: {
        serverId: number;
        serverCode: string;
        crawlerStatusService: CrawlerStatusService;
        crawlerActivityLogsService: CrawlerActivityLogsService;
        executionLogId?: number | null;
        logger: Logger;
    }
): Promise<void> {
    const { serverId, serverCode, crawlerStatusService, crawlerActivityLogsService, executionLogId, logger } = deps;
    const nextCheckAt = new Date(Date.now() + RECAPTCHA_CHECK_INTERVAL_MS);
    crawlerStatusService.updateRecaptchaNextCheck(serverId, nextCheckAt);
    if (executionLogId != null) {
        await crawlerActivityLogsService.logActivity({
            executionLogId,
            serverId,
            operationType: 'Recaptcha Check',
            eventType: CrawlerActivityEventType.RECAPTCHA_BLOCKED,
            message: 'reCAPTCHA nadal wymaga odblokowania',
        });
    }
    logger.warn(`🚨 RecaptchaCheck: server ${serverCode} still blocked, next check in 10 min`);
}

/**
 * Executes RecaptchaCheck for a blocked server: logs in, navigates to game, performs trigger
 * navigations (overview, profile) to surface bot protection, then classifies error.
 * If still blocked: updates nextCheckAt, logs RECAPTCHA_BLOCKED.
 * If unblocked: clears blocked state, resets plan, logs SUCCESS.
 *
 * @param deps Dependencies for execution
 */
export async function executeRecaptchaCheckTaskOperation(
    deps: ExecuteRecaptchaCheckTaskDependencies
): Promise<void> {
    const {
        serverId,
        credentials,
        plemionaCookiesService,
        serversService,
        crawlerStatusService,
        crawlerActivityLogsService,
        multiServerState,
        logger,
        executionLogId
    } = deps;

    const serverName = await serversService.getServerName(serverId);
    const serverCode = await serversService.getServerCode(serverId);

    logger.log(`🔐 RecaptchaCheck: logging in to ${serverCode} (${serverName})...`);

    const browserPage = await createBrowserPage({ headless: true });
    const browser = browserPage.browser;
    const { page } = browserPage;

    try {
        const loginResult = await AuthUtils.loginAndSelectWorld(
            page,
            credentials,
            plemionaCookiesService,
            serverName
        );

        if (!loginResult.success || !loginResult.worldSelected) {
            const urlAfterLogin = page.url();
            const classificationAfterLogin = await classifyCrawlerErrorOperation(page, urlAfterLogin);
            if (classificationAfterLogin === 'recaptcha_blocked') {
                await handleRecaptchaStillBlocked({
                    serverId,
                    serverCode,
                    crawlerStatusService,
                    crawlerActivityLogsService,
                    executionLogId,
                    logger,
                });
                return;
            }
            throw new Error(`Login failed for RecaptchaCheck: ${loginResult.error || 'Unknown error'}`);
        }

        const baseUrl = `https://${serverCode}.plemiona.pl/game.php`;
        await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 15000 });

        let classification = await classifyCrawlerErrorOperation(page, page.url());
        if (classification === 'recaptcha_blocked') {
            await handleRecaptchaStillBlocked({
                serverId,
                serverCode,
                crawlerStatusService,
                crawlerActivityLogsService,
                executionLogId,
                logger,
            });
            return;
        }

        const triggerScreens = [
            `${baseUrl}?screen=overview_villages&mode=prod`,
            `${baseUrl}?screen=info_player`,
        ];
        for (const screenUrl of triggerScreens) {
            await page.goto(screenUrl, { waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});
            await page.waitForTimeout(1200);
            classification = await classifyCrawlerErrorOperation(page, page.url());
            if (classification === 'recaptcha_blocked') {
                await handleRecaptchaStillBlocked({
                    serverId,
                    serverCode,
                    crawlerStatusService,
                    crawlerActivityLogsService,
                    executionLogId,
                    logger,
                });
                return;
            }
        }

        crawlerStatusService.clearRecaptchaBlocked(serverId);
        if (executionLogId != null) {
            await crawlerActivityLogsService.logActivity({
                executionLogId,
                serverId,
                operationType: 'Recaptcha Check',
                eventType: CrawlerActivityEventType.SUCCESS,
                message: 'Odblokowano reCAPTCHA, plan zresetowany',
            });
        }
        resetServerPlanExecutionTimesOperation(serverId, {
            multiServerState,
            logger
        });
        logger.log(`✅ RecaptchaCheck: server ${serverCode} unblocked, plan reset`);
    } finally {
        await browser?.close();
    }
}
