import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { VillageConstructionQueueEntity } from '../../entities/village-construction-queue.entity';

export interface RemoveFromQueueDependencies {
    queueRepository: Repository<VillageConstructionQueueEntity>;
    logger: any;
}

/**
 * Usuwa wpis z kolejki budowy
 * @param id ID wpisu do usunięcia (number)
 * @param deps Zależności potrzebne do wykonania operacji
 * @returns Usunięty wpis
 * @throws NotFoundException jeśli wpis nie istnieje
 */
export async function removeFromQueueOperation(
    id: number,
    deps: RemoveFromQueueDependencies
): Promise<VillageConstructionQueueEntity> {
    const { queueRepository, logger } = deps;
    const queueItem = await queueRepository.findOne({
        where: { id },
        relations: ['village']
    });

    if (!queueItem) {
        logger.error(`Queue item ${id} not found`);
        throw new NotFoundException(`Queue item with ID ${id} not found`);
    }

    await queueRepository.remove(queueItem);
    logger.log(`Removed ${queueItem.buildingName} level ${queueItem.targetLevel} from queue for village ${queueItem.villageId}`);

    return queueItem;
}

