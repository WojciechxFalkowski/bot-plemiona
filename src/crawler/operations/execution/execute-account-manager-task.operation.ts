import { Logger } from '@nestjs/common';

export interface ExecuteAccountManagerTaskDependencies {
    crawlerService: any; // Needs crawlerService to access Account Manager logic
    logger: Logger;
}

export async function executeAccountManagerTaskOperation(
    serverId: number,
    deps: ExecuteAccountManagerTaskDependencies
): Promise<void> {
    const { crawlerService, logger } = deps;
    logger.log(`Executing Account Manager automation for server ${serverId}...`);

    try {
        await crawlerService.assignTroopTemplates(serverId);
        logger.log(`Successfully completed Account Manager automation for server ${serverId}`);
    } catch (error) {
        logger.error(`Error during Account Manager automation for server ${serverId}:`, error);
        throw error;
    }
}
