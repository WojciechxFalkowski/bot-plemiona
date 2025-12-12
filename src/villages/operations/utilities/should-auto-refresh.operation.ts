import { Repository } from 'typeorm';
import { VillageEntity } from '../../entities/village.entity';

export interface ShouldAutoRefreshDependencies {
    villageRepository: Repository<VillageEntity>;
}

/**
 * Sprawdza czy należy automatycznie odświeżyć dane wiosek
 * @param serverId ID serwera
 * @param autoRefreshThresholdMs Próg czasu w milisekundach (domyślnie 1 godzina)
 * @param deps Zależności potrzebne do wykonania operacji
 * @returns true jeśli dane są starsze niż próg, false w przeciwnym razie
 */
export async function shouldAutoRefreshOperation(
    serverId: number,
    autoRefreshThresholdMs: number,
    deps: ShouldAutoRefreshDependencies
): Promise<boolean> {
    const { villageRepository } = deps;
    
    const latestVillage = await villageRepository.findOne({
        where: { serverId },
        order: { updatedAt: 'DESC' }
    });

    if (!latestVillage) {
        return true; // No villages exist, should refresh
    }

    const timeSinceLastUpdate = Date.now() - latestVillage.updatedAt.getTime();
    return timeSinceLastUpdate > autoRefreshThresholdMs;
}

