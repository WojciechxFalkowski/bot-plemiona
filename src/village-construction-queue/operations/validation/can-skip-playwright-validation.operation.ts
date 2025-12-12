import { Repository } from 'typeorm';
import { VillageConstructionQueueEntity } from '../../entities/village-construction-queue.entity';
import { findQueueItemByLevelOperation, FindQueueItemByLevelDependencies } from '../queue-management/find-queue-item-by-level.operation';

export interface CanSkipPlaywrightValidationDependencies {
    logger: any;
    findQueueItemByLevelDeps: FindQueueItemByLevelDependencies;
}

/**
 * Sprawdza, czy można pominąć walidację Playwright na podstawie istniejącego wpisu w kolejce
 * @param serverId ID serwera
 * @param villageId ID wioski
 * @param buildingId ID budynku
 * @param targetLevel Docelowy poziom
 * @param deps Zależności potrzebne do wykonania operacji
 * @returns true jeśli można pominąć walidację Playwright, false w przeciwnym razie
 */
export async function canSkipPlaywrightValidationOperation(
    serverId: number,
    villageId: string,
    buildingId: string,
    targetLevel: number,
    deps: CanSkipPlaywrightValidationDependencies
): Promise<boolean> {
    const { logger, findQueueItemByLevelDeps } = deps;
    const previousLevel = targetLevel - 1;

    if (previousLevel < 1) {
        return false;
    }

    const previousLevelItem = await findQueueItemByLevelOperation(
        serverId,
        villageId,
        buildingId,
        previousLevel,
        findQueueItemByLevelDeps
    );

    if (previousLevelItem) {
        logger.log(
            `Found previous level ${previousLevel} in queue for ${buildingId} in village ${villageId} on server ${serverId}. ` +
            `Skipping Playwright validation for level ${targetLevel}.`
        );
        return true;
    }

    return false;
}

