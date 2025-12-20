import { Repository } from 'typeorm';
import { BarbarianVillageEntity } from '../../entities/barbarian-village.entity';
import { Logger } from '@nestjs/common';

export interface UpdateCanAttackFlagDependencies {
    barbarianVillageRepository: Repository<BarbarianVillageEntity>;
    logger: Logger;
}

/**
 * Aktualizuje flagę canAttack bez walidacji
 * @param target ID wioski (target)
 * @param canAttack Nowa wartość flagi canAttack
 * @param deps Zależności potrzebne do wykonania operacji
 */
export async function updateCanAttackFlagOperation(
    target: string,
    canAttack: boolean,
    deps: UpdateCanAttackFlagDependencies
): Promise<void> {
    const { barbarianVillageRepository, logger } = deps;

    try {
        await barbarianVillageRepository.update({ target }, { canAttack });
        logger.log(`Updated canAttack flag for village ${target} to ${canAttack}`);
    } catch (error) {
        logger.error(`Failed to update canAttack flag for village ${target}:`, error);
    }
}















