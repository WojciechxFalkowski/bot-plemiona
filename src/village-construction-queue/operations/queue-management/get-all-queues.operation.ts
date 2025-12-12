import { Repository } from 'typeorm';
import { VillageConstructionQueueEntity } from '../../entities/village-construction-queue.entity';

export interface GetAllQueuesDependencies {
    queueRepository: Repository<VillageConstructionQueueEntity>;
    logger: any;
}

/**
 * Pobiera całą kolejkę budowy dla wszystkich wiosek
 * @param serverId Opcjonalny ID serwera do filtrowania
 * @param deps Zależności potrzebne do wykonania operacji
 * @returns Lista wszystkich budynków w kolejce dla wszystkich wiosek lub filtrowana według serwera
 */
export async function getAllQueuesOperation(
    serverId: number | undefined,
    deps: GetAllQueuesDependencies
): Promise<VillageConstructionQueueEntity[]> {
    const { queueRepository, logger } = deps;
    const whereCondition = serverId ? { serverId } : {};

    const queueItems = await queueRepository.find({
        where: whereCondition,
        order: { createdAt: 'ASC' }, // FIFO - First In, First Out
        relations: ['village']
    });

    const logMessage = serverId
        ? `Retrieved ${queueItems.length} total queue items for server ${serverId}`
        : `Retrieved ${queueItems.length} total queue items for all villages`;

    logger.log(logMessage);
    return queueItems;
}

