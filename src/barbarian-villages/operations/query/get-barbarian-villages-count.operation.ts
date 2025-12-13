import { Repository } from 'typeorm';
import { BarbarianVillageEntity } from '../../entities/barbarian-village.entity';

export interface GetBarbarianVillagesCountDependencies {
    barbarianVillageRepository: Repository<BarbarianVillageEntity>;
}

/**
 * Liczy wszystkie wioski barbarzyńskie dla danego serwera
 * @param serverId ID serwera
 * @param deps Zależności potrzebne do wykonania operacji
 * @returns Liczba wiosek
 */
export async function getBarbarianVillagesCountOperation(
    serverId: number,
    deps: GetBarbarianVillagesCountDependencies
): Promise<number> {
    const { barbarianVillageRepository } = deps;

    return await barbarianVillageRepository.count({ where: { serverId } });
}


