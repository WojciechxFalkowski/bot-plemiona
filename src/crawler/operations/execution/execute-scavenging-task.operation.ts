import { Logger } from '@nestjs/common';
import { CrawlerService } from '../../crawler.service';

export interface ExecuteScavengingTaskDependencies {
    crawlerService: CrawlerService;
    logger: Logger;
}

/**
 * Executes scavenging processing for a server
 * @param serverId ID of the server
 * @param deps Dependencies needed for execution
 */
export async function executeScavengingTaskOperation(
    serverId: number,
    deps: ExecuteScavengingTaskDependencies
): Promise<void> {
    const { crawlerService, logger } = deps;
    logger.log(`🚀 Executing scavenging for server ${serverId}`);
    await crawlerService.performScavenging(serverId);
}

