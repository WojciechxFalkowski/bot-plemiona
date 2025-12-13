import { Logger } from '@nestjs/common';
import { MultiServerState } from '../query/get-multi-server-status.operation';
import { validateAutoScavengingEnabledOperation } from '../validation/validate-auto-scavenging-enabled.operation';
import { validateConstructionQueueEnabledOperation } from '../validation/validate-construction-queue-enabled.operation';
import { validateMiniAttacksEnabledOperation } from '../validation/validate-mini-attacks-enabled.operation';
import { validateArmyTrainingEnabledOperation } from '../validation/validate-army-training-enabled.operation';
import { validatePlayerVillageAttacksEnabledOperation } from '../validation/validate-player-village-attacks-enabled.operation';

export interface UpdateServerTaskStatesDependencies {
    multiServerState: MultiServerState;
    logger: Logger;
    settingsService: any; // SettingsService
}

/**
 * Updates task enabled states for a specific server
 * @param serverId ID of the server
 * @param deps Dependencies needed for update
 */
export async function updateServerTaskStatesOperation(
    serverId: number,
    deps: UpdateServerTaskStatesDependencies
): Promise<void> {
    const { multiServerState, logger } = deps;
    const plan = multiServerState.serverPlans.get(serverId);

    if (!plan) {
        logger.warn(`No plan found for server ${serverId}`);
        return;
    }

    try {
        // Update enabled states for all tasks
        plan.constructionQueue.enabled = await validateConstructionQueueEnabledOperation(serverId, deps);
        plan.scavenging.enabled = await validateAutoScavengingEnabledOperation(serverId, deps);
        plan.miniAttacks.enabled = await validateMiniAttacksEnabledOperation(serverId, deps);
        plan.playerVillageAttacks.enabled = await validatePlayerVillageAttacksEnabledOperation(serverId, deps);
        plan.armyTraining.enabled = await validateArmyTrainingEnabledOperation(serverId, deps);

        logger.debug(`📋 Server ${plan.serverCode} tasks: Construction=${plan.constructionQueue.enabled}, Scavenging=${plan.scavenging.enabled}, MiniAttacks=${plan.miniAttacks.enabled}, PlayerVillageAttacks=${plan.playerVillageAttacks.enabled}, ArmyTraining=${plan.armyTraining.enabled}`);
    } catch (error) {
        logger.error(`❌ Error updating task states for server ${serverId}:`, error);
        throw error;
    }
}


