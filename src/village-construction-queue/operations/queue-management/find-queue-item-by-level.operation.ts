import { Repository } from 'typeorm';
import { VillageConstructionQueueEntity } from '../../entities/village-construction-queue.entity';

export interface FindQueueItemByLevelDependencies {
    queueRepository: Repository<VillageConstructionQueueEntity>;
}

/**
 * Znajduje wpis w kolejce dla konkretnego poziomu budynku
 * @param serverId ID serwera
 * @param villageId ID wioski
 * @param buildingId ID budynku
 * @param level Poziom do znalezienia
 * @param deps Zależności potrzebne do wykonania operacji
 * @returns Wpis w kolejce lub null jeśli nie znaleziono
 */
export async function findQueueItemByLevelOperation(
    serverId: number,
    villageId: string,
    buildingId: string,
    level: number,
    deps: FindQueueItemByLevelDependencies
): Promise<VillageConstructionQueueEntity | null> {
    const { queueRepository } = deps;
    const queueItem = await queueRepository.findOne({
        where: {
            serverId: serverId,
            villageId: villageId,
            buildingId: buildingId,
            targetLevel: level
        }
    });

    return queueItem;
}

