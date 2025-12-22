import { Page } from 'playwright';
import { AttackUtils, AttackResult, BarbarianVillage, ERROR_MESSAGE_ATTACK_BUTTON_NOT_FOUND, ERROR_MESSAGE_ATTACK_FORM_NOT_FOUND } from '@/utils/army/attack.utils';
import { ArmyData } from '@/utils/army/army.utils';
import { BarbarianVillageEntity } from '../../entities/barbarian-village.entity';
import { MiniAttackStrategiesService } from '@/mini-attack-strategies';
import { MiniAttackStrategyResponseDto } from '@/mini-attack-strategies/dto';
import { Logger } from '@nestjs/common';

export interface ExecuteAttackOnVillageDependencies {
    page: Page;
    village: BarbarianVillageEntity;
    armyData: ArmyData;
    villageId: string;
    serverCode: string;
    attackUtils: typeof AttackUtils;
    miniAttackStrategiesService: MiniAttackStrategiesService;
    logger: Logger;
    strategy?: MiniAttackStrategyResponseDto;
}

/**
 * Wykonuje pojedynczy atak na wioskę barbarzyńską
 * @param deps Zależności potrzebne do wykonania operacji
 * @returns Wynik ataku
 */
export async function executeAttackOnVillageOperation(
    deps: ExecuteAttackOnVillageDependencies
): Promise<AttackResult> {
    const { page, village, armyData, villageId, serverCode, attackUtils, miniAttackStrategiesService, logger, strategy } = deps;

    logger.log(`Executing attack on village ${village.name} (${village.coordinateX}|${village.coordinateY})`);

    try {
        const barbarianVillage: BarbarianVillage = {
            target: village.target,
            name: village.name,
            coordinateX: village.coordinateX,
            coordinateY: village.coordinateY,
            canAttack: village.canAttack,
            createdAt: village.createdAt,
            updatedAt: village.updatedAt
        };

        let attackResult: AttackResult;
        try {
            let attackStrategy: MiniAttackStrategyResponseDto;

            if (strategy) {
                attackStrategy = strategy;
                logger.log(`Using provided strategy for village ${villageId}: spear=${attackStrategy.spear}, sword=${attackStrategy.sword}, light=${attackStrategy.light}`);
            } else {
                logger.debug(`Checking for strategy: serverId=${village.serverId}, villageId=${villageId} (type: ${typeof villageId})`);
                attackStrategy = await miniAttackStrategiesService.findByServerAndVillage(village.serverId, villageId);
                logger.log(`Found custom strategy for village ${villageId}: spear=${attackStrategy.spear}, sword=${attackStrategy.sword}, light=${attackStrategy.light}`);
            }

            if (attackStrategy.spear > 0 && attackStrategy.sword > 0) {
                logger.log(`Using spear & sword attack strategy (${attackStrategy.spear} spear, ${attackStrategy.sword} sword)`);
                attackResult = await attackUtils.performMiniAttackSpearSword(page, barbarianVillage, villageId, serverCode, attackStrategy.spear, attackStrategy.sword);
            } else if (attackStrategy.light > 0) {
                logger.log(`Using light cavalry attack strategy (${attackStrategy.light} light)`);
                attackResult = await attackUtils.performMiniAttack(page, barbarianVillage, villageId, serverCode, attackStrategy.light);
            } else {
                logger.error(`Strategy has units not supported by current attack methods. No attack will be performed.`);
                attackResult = {
                    success: false,
                    targetVillage: barbarianVillage,
                    error: 'Strategy has unsupported units - no attack performed'
                };
            }

            if (attackResult.error === ERROR_MESSAGE_ATTACK_BUTTON_NOT_FOUND || attackResult.error === ERROR_MESSAGE_ATTACK_FORM_NOT_FOUND) {
                return {
                    success: false,
                    targetVillage: barbarianVillage,
                    error: ERROR_MESSAGE_ATTACK_BUTTON_NOT_FOUND
                };
            }

        } catch (strategyError) {
            logger.error(`No custom strategy found for village ${villageId}. Error: ${strategyError.message}. No attack will be performed.`);
            attackResult = {
                success: false,
                targetVillage: barbarianVillage,
                error: `No strategy found for village ${villageId} - no attack performed`
            };
        }

        logger.log(`Attack executed successfully on ${village.name}: ${attackResult.success ? 'SUCCESS' : 'FAILED'}`);

        if (attackResult.error) {
            logger.error(`Attack error: ${attackResult.error}`);
        }

        return attackResult;

    } catch (error) {
        logger.error(`Error executing attack on village ${village.name}:`, error);
        return {
            success: false,
            error: error.message || 'Unknown attack error',
            targetVillage: {
                target: village.target,
                name: village.name,
                coordinateX: village.coordinateX,
                coordinateY: village.coordinateY,
                canAttack: village.canAttack,
                createdAt: village.createdAt,
                updatedAt: village.updatedAt
            }
        };
    }
}
