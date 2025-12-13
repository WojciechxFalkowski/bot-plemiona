import { ScavengingTimeData, VillageScavengingData } from '@/utils/scavenging/scavenging.interfaces';
import { Logger } from '@nestjs/common';

export interface UpdateVillageStateAfterDispatchDependencies {
    scavengingTimeData: ScavengingTimeData;
    logger: Logger;
}

/**
 * Updates village state after dispatching a scavenging mission
 * @param villageId ID of the village
 * @param level Scavenging level that was dispatched
 * @param durationSeconds Mission duration in seconds
 * @param deps Dependencies containing scavenging time data and logger
 */
export function updateVillageStateAfterDispatchOperation(
    villageId: string,
    level: number,
    durationSeconds: number,
    deps: UpdateVillageStateAfterDispatchDependencies
): void {
    const { scavengingTimeData, logger } = deps;

    const villageData = scavengingTimeData.villages.find(v => v.villageId === villageId);
    if (!villageData) {
        logger.warn(`Cannot update village state - village ${villageId} not found in scavenging data`);
        return;
    }

    // Find level to update
    const levelData = villageData.levels.find(l => l.level === level);
    if (!levelData) {
        logger.warn(`Cannot update village state - level ${level} not found in village ${villageId} data`);
        return;
    }

    // Update level status to "busy"
    const now = new Date();
    levelData.status = 'busy';
    levelData.timeRemainingSeconds = durationSeconds;
    levelData.estimatedCompletionTime = new Date(now.getTime() + (durationSeconds * 1000));

    // Format remaining time
    if (durationSeconds > 0) {
        const hours = Math.floor(durationSeconds / 3600);
        const minutes = Math.floor((durationSeconds % 3600) / 60);
        const seconds = durationSeconds % 60;
        levelData.timeRemaining = `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else {
        logger.warn(`Duration seconds is 0 for village ${villageData.villageName} level ${level}. Setting time remaining to 0:00:00`);
        levelData.timeRemaining = '0:00:00';
    }

    logger.debug(`Updated village ${villageData.villageName} level ${level} status to busy (${levelData.timeRemaining} remaining)`);
}


