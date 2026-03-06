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
        const scrapeResult = await crawlerService.getAccountManagerCombinedData(serverId);
        logger.log(`Scraped ${scrapeResult.villages.length} villages. Combined execution time: ${scrapeResult.executionTimeMs}ms`);

        // Filter villages that have a template to assign and are not currently recruiting
        const villagesWithTemplate = scrapeResult.villages.filter(v =>
            v.armyTemplateName && v.armyTemplateName !== '' && !v.isRecruiting
        );

        if (villagesWithTemplate.length > 0) {
            const assignResult = await crawlerService.assignAccountManagerTroopTemplates(serverId, villagesWithTemplate);
            logger.log(`Assigned templates to ${villagesWithTemplate.length} villages. Assignment time: ${assignResult.totalExecutionTimeMs}ms`);
        } else {
            logger.log(`No villages require template assignment at this time.`);
        }

        logger.log(`Successfully completed Account Manager automation for server ${serverId}`);
    } catch (error) {
        logger.error(`Error during Account Manager automation for server ${serverId}:`, error);
        throw error;
    }
}
