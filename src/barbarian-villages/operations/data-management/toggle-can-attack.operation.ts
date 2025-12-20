import { Repository } from 'typeorm';
import { BarbarianVillageEntity } from '../../entities/barbarian-village.entity';
import { Logger } from '@nestjs/common';
import { findOneBarbarianVillageOperation } from '../query/find-one-barbarian-village.operation';

export interface ToggleCanAttackDependencies {
    barbarianVillageRepository: Repository<BarbarianVillageEntity>;
    logger: Logger;
}

/**
 * Przełącza flagę canAttack dla wioski barbarzyńskiej
 * @param serverId ID serwera
 * @param target ID wioski (target)
 * @param deps Zależności potrzebne do wykonania operacji
 * @returns Zaktualizowana encja wioski barbarzyńskiej
 */
export async function toggleCanAttackOperation(
    serverId: number,
    target: string,
    deps: ToggleCanAttackDependencies
): Promise<BarbarianVillageEntity> {
    const { barbarianVillageRepository, logger } = deps;

    logger.log(`Toggling canAttack for barbarian village ${target} on server ${serverId}`);

    const village = await findOneBarbarianVillageOperation(serverId, target, {
        barbarianVillageRepository,
        logger
    });

    village.canAttack = !village.canAttack;

    const savedVillage = await barbarianVillageRepository.save(village);
    logger.log(`CanAttack toggled for ${savedVillage.name} (${target}): ${savedVillage.canAttack} on server ${serverId}`);

    return savedVillage;
}















