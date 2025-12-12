import { ConflictException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { VillageConstructionQueueEntity } from '../../entities/village-construction-queue.entity';

export interface ValidateNoDuplicateInQueueDependencies {
    queueRepository: Repository<VillageConstructionQueueEntity>;
    logger: any;
}

/**
 * Sprawdza czy nie ma już duplikatu w kolejce budowy
 * @param villageId ID wioski
 * @param buildingId ID budynku
 * @param targetLevel Docelowy poziom
 * @param buildingName Nazwa budynku (do komunikatu błędu)
 * @param deps Zależności potrzebne do wykonania operacji
 * @throws ConflictException jeśli duplikat istnieje
 */
export async function validateNoDuplicateInQueueOperation(
    villageId: string,
    buildingId: string,
    targetLevel: number,
    buildingName: string,
    deps: ValidateNoDuplicateInQueueDependencies
): Promise<void> {
    const { queueRepository, logger } = deps;
    const existingQueueItem = await queueRepository.findOne({
        where: {
            villageId: villageId,
            buildingId: buildingId,
            targetLevel: targetLevel
        }
    });

    if (existingQueueItem) {
        logger.error(`Duplicate queue item: ${buildingId} level ${targetLevel} already exists for village ${villageId}`);
        throw new ConflictException(
            `Building '${buildingName}' level ${targetLevel} is already in queue for village ${villageId}`
        );
    }
}

