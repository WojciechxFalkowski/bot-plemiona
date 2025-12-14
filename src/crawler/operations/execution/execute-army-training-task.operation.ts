import { Logger } from '@nestjs/common';
import { ArmyTrainingService } from '@/army-training/army-training.service';
import { ArmyTrainingStrategiesService } from '@/army-training/army-training-strategies.service';

export interface ExecuteArmyTrainingTaskDependencies {
    armyTrainingService: ArmyTrainingService;
    armyTrainingStrategiesService: ArmyTrainingStrategiesService;
    logger: Logger;
}

/**
 * Executes army training for a server
 * @param serverId ID of the server
 * @param deps Dependencies needed for execution
 */
export async function executeArmyTrainingTaskOperation(
    serverId: number,
    deps: ExecuteArmyTrainingTaskDependencies
): Promise<void> {
    const { armyTrainingService, armyTrainingStrategiesService, logger } = deps;
    logger.log(`🚀 Executing army training for server ${serverId}`);

    try {
        // Get active army training strategies for this server
        const strategies = await armyTrainingStrategiesService.findActiveByServer(serverId);
        if (strategies.length === 0) {
            logger.warn(`⚠️ No active army training strategies found for server ${serverId}`);
            return;
        }

        logger.log(`📋 Found ${strategies.length} active army training strategies for server ${serverId}`);

        // Execute army training for each strategy (village)
        for (const strategy of strategies) {
            logger.log(`⚔️ Starting army training for village ${strategy.villageId} on server ${serverId}`);

            try {
                await armyTrainingService.startTrainingUnits(strategy, serverId);
                logger.log(`✅ Army training completed for village ${strategy.villageId} on server ${serverId}`);
            } catch (villageError) {
                logger.error(`❌ Error executing army training for village ${strategy.villageId} on server ${serverId}:`, villageError);
                // Continue with next village instead of stopping
            }
        }

        logger.log(`🎯 All army training completed for server ${serverId}`);

    } catch (error) {
        logger.error(`❌ Error during army training execution for server ${serverId}:`, error);
        throw error;
    }
}

