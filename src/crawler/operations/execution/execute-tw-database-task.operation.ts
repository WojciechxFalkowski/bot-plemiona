import { Logger } from '@nestjs/common';
import { TwDatabaseService } from '@/tw-database/tw-database.service';

export interface ExecuteTwDatabaseTaskDependencies {
    twDatabaseService: TwDatabaseService;
    logger: Logger;
}

/**
 * Executes TW Database visit attack planner for a server.
 */
export async function executeTwDatabaseTaskOperation(
    serverId: number,
    deps: ExecuteTwDatabaseTaskDependencies
): Promise<void> {
    const { twDatabaseService, logger } = deps;
    logger.log(`Executing TW Database for server ${serverId}`);

    const headless = process.env.NODE_ENV === 'production';
    const result = await twDatabaseService.visitAttackPlanner(serverId, headless);

    if (!result.success) {
        throw new Error(result.message ?? 'TW Database visit failed');
    }
}
