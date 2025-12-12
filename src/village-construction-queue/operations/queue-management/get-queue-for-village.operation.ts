import { Repository } from 'typeorm';
import { VillageConstructionQueueEntity } from '../../entities/village-construction-queue.entity';

export interface GetQueueForVillageDependencies {
    queueRepository: Repository<VillageConstructionQueueEntity>;
    logger: any;
}

/**
 * Pobiera całą kolejkę budowy dla określonej wioski
 * @param villageId ID wioski
 * @param deps Zależności potrzebne do wykonania operacji
 * @returns Lista wszystkich budynków w kolejce dla tej wioski
 */
export async function getQueueForVillageOperation(
    villageId: string,
    deps: GetQueueForVillageDependencies
): Promise<VillageConstructionQueueEntity[]> {
    const { queueRepository, logger } = deps;
    const queueItems = await queueRepository.find({
        where: { villageId },
        order: { createdAt: 'ASC' }, // FIFO - First In, First Out
        relations: ['village']
    });

    logger.log(`Retrieved ${queueItems.length} queue items for village ${villageId}`);
    return queueItems;
}

