import { Repository } from 'typeorm';
import { VillageEntity } from '../../entities/village.entity';

export interface GetAutoBuildingCountDependencies {
    villageRepository: Repository<VillageEntity>;
}

/**
 * Pobiera liczbę wiosek z włączonym auto-building dla danego serwera
 * @param serverId ID serwera
 * @param deps Zależności potrzebne do wykonania operacji
 * @returns Liczba wiosek z auto-building
 */
export async function getAutoBuildingCountOperation(
    serverId: number,
    deps: GetAutoBuildingCountDependencies
): Promise<number> {
    const { villageRepository } = deps;
    return villageRepository.count({
        where: { serverId, isAutoBuildEnabled: true }
    });
}

