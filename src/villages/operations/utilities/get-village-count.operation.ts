import { Repository } from 'typeorm';
import { VillageEntity } from '../../entities/village.entity';

export interface GetVillageCountDependencies {
    villageRepository: Repository<VillageEntity>;
}

/**
 * Pobiera liczbę wiosek dla danego serwera
 * @param serverId ID serwera
 * @param deps Zależności potrzebne do wykonania operacji
 * @returns Liczba wiosek
 */
export async function getVillageCountOperation(
    serverId: number,
    deps: GetVillageCountDependencies
): Promise<number> {
    const { villageRepository } = deps;
    return villageRepository.count({ where: { serverId } });
}

