import { Repository } from 'typeorm';
import { BarbarianVillageEntity } from '../../entities/barbarian-village.entity';

export interface GetAttackableCountDependencies {
    barbarianVillageRepository: Repository<BarbarianVillageEntity>;
}

/**
 * Liczy wioski barbarzyńskie możliwe do ataku dla danego serwera
 * @param serverId ID serwera
 * @param deps Zależności potrzebne do wykonania operacji
 * @returns Liczba wiosek możliwych do ataku
 */
export async function getAttackableCountOperation(
    serverId: number,
    deps: GetAttackableCountDependencies
): Promise<number> {
    const { barbarianVillageRepository } = deps;

    return await barbarianVillageRepository.count({
        where: { serverId, canAttack: true }
    });
}


