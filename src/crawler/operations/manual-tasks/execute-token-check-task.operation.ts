import { Logger } from '@nestjs/common';
import { ServersService } from '@/servers/servers.service';
import { PlemionaCredentials } from '@/utils/auth/auth.interfaces';
import { PlemionaCookiesService } from '@/plemiona-cookies';
import { createBrowserSessionOperation } from '@/village-construction-queue/operations/browser/create-browser-session.operation';
import { CrawlerStatusService } from '@/crawler/crawler-status.service';
import { CrawlerActivityLogsService } from '@/crawler-activity-logs/crawler-activity-logs.service';
import { CrawlerActivityEventType } from '@/crawler-activity-logs/entities/crawler-activity-log.entity';

export interface ExecuteTokenCheckTaskDependencies {
    serversService: ServersService;
    credentials: PlemionaCredentials;
    plemionaCookiesService: PlemionaCookiesService;
    crawlerStatusService: CrawlerStatusService;
    crawlerActivityLogsService: CrawlerActivityLogsService;
    logger: Logger;
    executionLogId?: number | null;
}

export async function executeTokenCheckTaskOperation(
    serverId: number,
    deps: ExecuteTokenCheckTaskDependencies
): Promise<void> {
    const {
        serversService,
        credentials,
        plemionaCookiesService,
        crawlerStatusService,
        crawlerActivityLogsService,
        logger,
        executionLogId
    } = deps;

    logger.log(`Executing manual Token Check for server ${serverId}...`);

    try {
        // Attempt to create a browser session. This includes logging in and selecting the world.
        // It will throw a BadRequestException if the login fails or world selector is not visible.
        const session = await createBrowserSessionOperation(serverId, {
            serversService,
            credentials,
            plemionaCookiesService,
            logger
        });

        // Close the session right away since we just wanted to check if login succeeds
        await session.browser.close();

        // If we reach here, the session creation was successful, meaning cookies are valid
        logger.log(`✅ Token Check successful for server ${serverId}. Clearing Token Expired status.`);
        crawlerStatusService.clearTokenExpired(serverId);

        if (executionLogId) {
            await crawlerActivityLogsService.logActivity({
                executionLogId,
                serverId,
                operationType: 'Manual Task: Token Check',
                eventType: CrawlerActivityEventType.SUCCESS,
                message: 'Pomyślnie zwalidowano sesję logowania. Ostrzeżenie o wygasłym tokenie zostało usunięte.'
            });
        }

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`❌ Token Check failed for server ${serverId}:`, error);

        if (executionLogId) {
            await crawlerActivityLogsService.logActivity({
                executionLogId,
                serverId,
                operationType: 'Manual Task: Token Check',
                eventType: CrawlerActivityEventType.ERROR,
                message: `Weryfikacja sesji nie powiodła się: ${errorMessage}`
            });
        }

        // Rethrow the error so that the wrapper can mark the task as failed
        throw error;
    }
}
