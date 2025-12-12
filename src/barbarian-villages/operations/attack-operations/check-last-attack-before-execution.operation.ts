import { Page } from 'playwright';
import { AttackUtils } from '@/utils/army/attack.utils';
import { BarbarianVillageEntity } from '../../entities/barbarian-village.entity';
import { Logger } from '@nestjs/common';
import { updateCanAttackFlagOperation } from '../data-management/update-can-attack-flag.operation';
import { Repository } from 'typeorm';

export interface CheckLastAttackBeforeExecutionDependencies {
    page: Page;
    targetVillage: BarbarianVillageEntity;
    villageId: string;
    serverCode: string;
    attackUtils: typeof AttackUtils;
    barbarianVillageRepository: Repository<BarbarianVillageEntity>;
    logger: Logger;
}

export interface CheckLastAttackResult {
    canAttack: boolean;
    reason: string;
}

/**
 * Sprawdza ostatni atak przed wykonaniem nowego
 * @param deps Zależności potrzebne do wykonania operacji
 * @returns Wynik sprawdzenia z informacją czy można atakować
 */
export async function checkLastAttackBeforeExecutionOperation(
    deps: CheckLastAttackBeforeExecutionDependencies
): Promise<CheckLastAttackResult> {
    const { page, targetVillage, villageId, serverCode, attackUtils, barbarianVillageRepository, logger } = deps;

    logger.debug('Checking last attack result...');
    const lastAttackCheck = await attackUtils.checkLastAttackResult(page, targetVillage, villageId, serverCode);

    if (!lastAttackCheck.canAttack) {
        logger.warn(`❌ Skipping attack on ${targetVillage.name}: ${lastAttackCheck.reason}`);

        await updateCanAttackFlagOperation(targetVillage.target, false, {
            barbarianVillageRepository,
            logger
        });
    } else {
        logger.debug(`✅ Last attack check passed: ${lastAttackCheck.reason}`);
    }

    return {
        canAttack: lastAttackCheck.canAttack,
        reason: lastAttackCheck.reason
    };
}

