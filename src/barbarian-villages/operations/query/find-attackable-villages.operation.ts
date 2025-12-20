import { Repository } from 'typeorm';
import { BarbarianVillageEntity } from '../../entities/barbarian-village.entity';
import { Logger } from '@nestjs/common';

export interface FindAttackableVillagesDependencies {
    barbarianVillageRepository: Repository<BarbarianVillageEntity>;
    logger: Logger;
}

/**
 * Pobiera wioski barbarzyńskie możliwe do ataku dla danego serwera i wioski
 * @param serverId ID serwera
 * @param villageId ID wioski gracza
 * @param deps Zależności potrzebne do wykonania operacji
 * @returns Tablica wiosek możliwych do ataku
 */
export async function findAttackableVillagesOperation(
    serverId: number,
    villageId: string,
    deps: FindAttackableVillagesDependencies
): Promise<BarbarianVillageEntity[]> {
    const { barbarianVillageRepository, logger } = deps;

    logger.debug(`Finding attackable barbarian villages for server ${serverId}`);
    const villages = await barbarianVillageRepository.find({
        where: { serverId, canAttack: true, villageId },
        order: { createdAt: 'ASC' }
    });
    logger.log(`Found ${villages.length} attackable barbarian villages for server ${serverId} and village ${villageId}`);

    return villages;
}















