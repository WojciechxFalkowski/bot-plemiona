import { Repository } from 'typeorm';
import { BarbarianVillageEntity } from '../../entities/barbarian-village.entity';
import { Logger } from '@nestjs/common';

export interface FindAllBarbarianVillagesDependencies {
    barbarianVillageRepository: Repository<BarbarianVillageEntity>;
    logger: Logger;
}

/**
 * Pobiera wszystkie wioski barbarzyńskie dla danego serwera
 * @param serverId ID serwera
 * @param villageId Opcjonalne ID wioski do filtrowania
 * @param coordinateX Opcjonalna współrzędna X
 * @param coordinateY Opcjonalna współrzędna Y
 * @param deps Zależności potrzebne do wykonania operacji
 * @returns Tablica wiosek barbarzyńskich
 */
export async function findAllBarbarianVillagesOperation(
    serverId: number,
    villageId: string | undefined,
    coordinateX: number | undefined,
    coordinateY: number | undefined,
    deps: FindAllBarbarianVillagesDependencies
): Promise<BarbarianVillageEntity[]> {
    const { barbarianVillageRepository, logger } = deps;

    const coordsLog = villageId && coordinateX !== undefined && coordinateY !== undefined
        ? ` for village ${villageId} at coordinates (${coordinateX};${coordinateY})`
        : villageId
            ? ` for village ${villageId}`
            : '';
    logger.log(`Finding all barbarian villages for server ${serverId}${coordsLog}`);

    return await barbarianVillageRepository.find({
        where: { serverId },
        order: { createdAt: 'DESC' }
    });
}

