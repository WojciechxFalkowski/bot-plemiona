import { Repository } from 'typeorm';
import { VillageEntity } from '../../entities/village.entity';

export interface GetAutoScavengingCountDependencies {
    villageRepository: Repository<VillageEntity>;
}

/**
 * Pobiera liczbę wiosek z włączonym auto-scavenging dla danego serwera
 * @param serverId ID serwera
 * @param deps Zależności potrzebne do wykonania operacji
 * @returns Liczba wiosek z auto-scavenging
 */
export async function getAutoScavengingCountOperation(
    serverId: number,
    deps: GetAutoScavengingCountDependencies
): Promise<number> {
    const { villageRepository } = deps;
    return villageRepository.count({
        where: { serverId, isAutoScavengingEnabled: true }
    });
}

