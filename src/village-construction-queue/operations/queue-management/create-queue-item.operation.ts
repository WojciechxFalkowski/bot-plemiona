import { Repository } from 'typeorm';
import { VillageConstructionQueueEntity } from '../../entities/village-construction-queue.entity';
import { VillageEntity } from '@/villages/entities/village.entity';
import { CreateConstructionQueueDto } from '../../dto/create-construction-queue.dto';

export interface CreateQueueItemDependencies {
    queueRepository: Repository<VillageConstructionQueueEntity>;
    logger: any;
}

/**
 * Tworzy i zapisuje nowy wpis w kolejce budowy
 * @param dto Dane budynku
 * @param buildingConfig Konfiguracja budynku
 * @param village Encja wioski
 * @param deps Zależności potrzebne do wykonania operacji
 * @returns Zapisany wpis w kolejce
 */
export async function createQueueItemOperation(
    dto: CreateConstructionQueueDto,
    buildingConfig: any,
    village: VillageEntity,
    deps: CreateQueueItemDependencies
): Promise<VillageConstructionQueueEntity> {
    const { queueRepository, logger } = deps;
    const queueItem = queueRepository.create({
        villageId: dto.villageId,
        buildingId: dto.buildingId,
        buildingName: buildingConfig.name,
        targetLevel: dto.targetLevel,
        village: village,
        serverId: dto.serverId
    });

    const savedItem = await queueRepository.save(queueItem);
    logger.log(`Successfully added for server ${dto.serverId} building: ${buildingConfig.name} level ${dto.targetLevel} to queue for village ${dto.villageId}`);

    return savedItem;
}

