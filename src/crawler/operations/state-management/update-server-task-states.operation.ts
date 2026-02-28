import { Logger } from '@nestjs/common';
import { MultiServerState } from '../query/get-multi-server-status.operation';
import { validateAutoScavengingEnabledOperation } from '../validation/validate-auto-scavenging-enabled.operation';
import { validateConstructionQueueEnabledOperation } from '../validation/validate-construction-queue-enabled.operation';
import { validateMiniAttacksEnabledOperation } from '../validation/validate-mini-attacks-enabled.operation';
import { validateArmyTrainingEnabledOperation } from '../validation/validate-army-training-enabled.operation';
import { validatePlayerVillageAttacksEnabledOperation } from '../validation/validate-player-village-attacks-enabled.operation';
import { validateTwDatabaseEnabledOperation } from '../validation/validate-tw-database-enabled.operation';
import { calculateRandomConstructionIntervalOperation } from '../calculations/calculate-random-construction-interval.operation';
import { calculateRandomMiniAttackIntervalOperation } from '../calculations/calculate-random-mini-attack-interval.operation';
import { calculateRandomArmyTrainingIntervalOperation } from '../calculations/calculate-random-army-training-interval.operation';
import { calculateRandomTwDatabaseIntervalOperation } from '../calculations/calculate-random-tw-database-interval.operation';

export interface UpdateServerTaskStatesDependencies {
    multiServerState: MultiServerState;
    logger: Logger;
    settingsService: any; // SettingsService
    encryptionService: any; // EncryptionService
    configService: any; // ConfigService
}

/**
 * Updates task enabled states for a specific server
 * When a task transitions from disabled to enabled, also updates nextExecutionTime
 * @param serverId ID of the server
 * @param deps Dependencies needed for update
 */
export async function updateServerTaskStatesOperation(
    serverId: number,
    deps: UpdateServerTaskStatesDependencies
): Promise<void> {
    const { multiServerState, logger, settingsService } = deps;
    const plan = multiServerState.serverPlans.get(serverId);

    if (!plan) {
        logger.warn(`No plan found for server ${serverId}`);
        return;
    }

    try {
        // Store previous enabled states to detect transitions
        const previousStates = {
            constructionQueue: plan.constructionQueue.enabled,
            scavenging: plan.scavenging.enabled,
            miniAttacks: plan.miniAttacks.enabled,
            playerVillageAttacks: plan.playerVillageAttacks.enabled,
            armyTraining: plan.armyTraining.enabled,
            twDatabase: plan.twDatabase.enabled
        };

        // Update enabled states for all tasks
        plan.constructionQueue.enabled = await validateConstructionQueueEnabledOperation(serverId, deps);
        plan.scavenging.enabled = await validateAutoScavengingEnabledOperation(serverId, deps);
        plan.miniAttacks.enabled = await validateMiniAttacksEnabledOperation(serverId, deps);
        plan.playerVillageAttacks.enabled = await validatePlayerVillageAttacksEnabledOperation(serverId, deps);
        plan.armyTraining.enabled = await validateArmyTrainingEnabledOperation(serverId, deps);
        plan.twDatabase.enabled = await validateTwDatabaseEnabledOperation(serverId, deps);

        // If task was just enabled (disabled -> enabled), set new nextExecutionTime
        if (!previousStates.constructionQueue && plan.constructionQueue.enabled) {
            const delay = calculateRandomConstructionIntervalOperation();
            plan.constructionQueue.nextExecutionTime = new Date(Date.now() + delay);
            logger.log(`🔄 Construction queue enabled for ${plan.serverCode}, next execution: ${plan.constructionQueue.nextExecutionTime.toLocaleString()}`);
        }

        if (!previousStates.scavenging && plan.scavenging.enabled) {
            // Use default 5 minute delay for scavenging when newly enabled
            const defaultDelay = 5 * 60 * 1000; // 5 minutes
            plan.scavenging.nextExecutionTime = new Date(Date.now() + defaultDelay);
            logger.log(`🔄 Scavenging enabled for ${plan.serverCode}, next execution: ${plan.scavenging.nextExecutionTime.toLocaleString()}`);
        }

        if (!previousStates.miniAttacks && plan.miniAttacks.enabled) {
            const delay = await calculateRandomMiniAttackIntervalOperation(serverId, { settingsService, logger });
            plan.miniAttacks.nextExecutionTime = new Date(Date.now() + delay);
            logger.log(`🔄 Mini attacks enabled for ${plan.serverCode}, next execution: ${plan.miniAttacks.nextExecutionTime.toLocaleString()}`);
        }

        if (!previousStates.playerVillageAttacks && plan.playerVillageAttacks.enabled) {
            // Use default 10 minute delay for player village attacks when newly enabled
            const defaultDelay = 10 * 60 * 1000; // 10 minutes
            plan.playerVillageAttacks.nextExecutionTime = new Date(Date.now() + defaultDelay);
            logger.log(`🔄 Player village attacks enabled for ${plan.serverCode}, next execution: ${plan.playerVillageAttacks.nextExecutionTime.toLocaleString()}`);
        }

        if (!previousStates.armyTraining && plan.armyTraining.enabled) {
            const delay = await calculateRandomArmyTrainingIntervalOperation(serverId, { settingsService, logger });
            plan.armyTraining.nextExecutionTime = new Date(Date.now() + delay);
            logger.log(`🔄 Army training enabled for ${plan.serverCode}, next execution: ${plan.armyTraining.nextExecutionTime.toLocaleString()}`);
        }

        if (!previousStates.twDatabase && plan.twDatabase.enabled) {
            const delay = calculateRandomTwDatabaseIntervalOperation();
            plan.twDatabase.nextExecutionTime = new Date(Date.now() + delay);
            logger.log(`🔄 TW Database enabled for ${plan.serverCode}, next execution: ${plan.twDatabase.nextExecutionTime.toLocaleString()}`);
        }

        logger.debug(`📋 Server ${plan.serverCode} tasks: Construction=${plan.constructionQueue.enabled}, Scavenging=${plan.scavenging.enabled}, MiniAttacks=${plan.miniAttacks.enabled}, PlayerVillageAttacks=${plan.playerVillageAttacks.enabled}, ArmyTraining=${plan.armyTraining.enabled}, TwDatabase=${plan.twDatabase.enabled}`);
    } catch (error) {
        logger.error(`❌ Error updating task states for server ${serverId}:`, error);
        throw error;
    }
}


