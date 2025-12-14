import { Logger } from '@nestjs/common';
import { VillageConstructionQueueService } from '@/village-construction-queue/village-construction-queue.service';

export interface ExecuteConstructionQueueTaskDependencies {
    constructionQueueService: VillageConstructionQueueService;
    logger: Logger;
}

/**
 * Executes construction queue processing for a server
 * @param serverId ID of the server
 * @param deps Dependencies needed for execution
 */
export async function executeConstructionQueueTaskOperation(
    serverId: number,
    deps: ExecuteConstructionQueueTaskDependencies
): Promise<void> {
    const { constructionQueueService } = deps;
    await constructionQueueService.processAndCheckConstructionQueue(serverId);
}

