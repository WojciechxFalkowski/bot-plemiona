import { Repository } from 'typeorm';
import { VillageConstructionQueueEntity } from '../../entities/village-construction-queue.entity';

export interface GetDatabaseQueueDependencies {
    queueRepository: Repository<VillageConstructionQueueEntity>;
    logger: any;
}

/**
 * Pobiera wszystkie budynki określonego typu z naszej kolejki w bazie dla danej wioski
 * @param serverId ID serwera
 * @param villageId ID wioski
 * @param buildingId ID budynku
 * @param deps Zależności potrzebne do wykonania operacji
 * @returns Lista budynków z bazy posortowana według targetLevel
 */
export async function getDatabaseQueueOperation(
    serverId: number,
    villageId: string,
    buildingId: string,
    deps: GetDatabaseQueueDependencies
): Promise<VillageConstructionQueueEntity[]> {
    const { queueRepository, logger } = deps;
    const queueItems = await queueRepository.find({
        where: {
            serverId: serverId,
            villageId: villageId,
            buildingId: buildingId
        },
        order: {
            targetLevel: 'ASC'
        }
    });

    logger.log(`Found ${queueItems.length} items in database queue for ${buildingId} in village ${villageId} on server ${serverId}`);

    return queueItems;
}

