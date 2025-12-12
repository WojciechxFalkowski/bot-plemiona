import { Page } from 'playwright';
import { AttackUtils, AttackResult, ERROR_MESSAGE_ATTACK_BUTTON_NOT_FOUND, ERROR_MESSAGE_ATTACK_FORM_NOT_FOUND } from '@/utils/army/attack.utils';
import { ArmyData, ArmyUtils } from '@/utils/army/army.utils';
import { BarbarianVillageEntity } from '../../entities/barbarian-village.entity';
import { MiniAttackStrategiesService } from '@/mini-attack-strategies';
import { MiniAttackStrategyResponseDto } from '@/mini-attack-strategies/dto';
import { Logger } from '@nestjs/common';
import { Repository } from 'typeorm';
import { findAttackableVillagesOperation } from '../query/find-attackable-villages.operation';
import { calculateMaxPossibleAttacksOperation } from './calculate-max-possible-attacks.operation';
import { checkLastAttackBeforeExecutionOperation } from './check-last-attack-before-execution.operation';
import { executeAttackOnVillageOperation } from './execute-attack-on-village.operation';
import { removeBarbarianVillageByTargetOperation } from '../data-management/remove-barbarian-village-by-target.operation';

export interface ExecuteMiniAttacksDependencies {
    page: Page;
    serverId: number;
    villageId: string;
    serverCode: string;
    barbarianVillageRepository: Repository<BarbarianVillageEntity>;
    armyUtils: typeof ArmyUtils;
    attackUtils: typeof AttackUtils;
    miniAttackStrategiesService: MiniAttackStrategiesService;
    logger: Logger;
    strategy?: MiniAttackStrategyResponseDto;
}

/**
 * Wykonuje serię mini-ataków dla wioski (główna logika pętli ataków)
 * @param deps Zależności potrzebne do wykonania operacji
 * @returns Tablica wyników ataków
 */
export async function executeMiniAttacksOperation(
    deps: ExecuteMiniAttacksDependencies
): Promise<AttackResult[]> {
    const { page, serverId, villageId, serverCode, barbarianVillageRepository, armyUtils, attackUtils, miniAttackStrategiesService, logger, strategy } = deps;

    logger.log(`Starting mini attacks execution for server ${serverId}, village ${villageId}`);

    const attackableVillages = await findAttackableVillagesOperation(serverId, villageId, {
        barbarianVillageRepository,
        logger
    });

    if (attackableVillages.length === 0) {
        logger.log(`No attackable barbarian villages found for server ${serverId}, village ${villageId}`);
        return [];
    }

    logger.log(`Found ${attackableVillages.length} attackable villages for server ${serverId}, village ${villageId}`);

    try {
        const armyData = await armyUtils.getArmyData(page, villageId, serverCode);

        let maxPossibleAttacks = 0;
        let attackStrategy: MiniAttackStrategyResponseDto | null = null;

        try {
            if (strategy) {
                attackStrategy = strategy;
                logger.log(`Using provided strategy for village ${villageId}: spear=${attackStrategy.spear}, sword=${attackStrategy.sword}, light=${attackStrategy.light}`);
            } else {
                attackStrategy = await miniAttackStrategiesService.findByServerAndVillage(serverId, villageId);
                logger.log(`Found strategy for village ${villageId}: spear=${attackStrategy.spear}, sword=${attackStrategy.sword}, light=${attackStrategy.light}`);
            }

            maxPossibleAttacks = calculateMaxPossibleAttacksOperation({
                armyData,
                attackStrategy,
                logger
            });

        } catch (strategyError) {
            logger.error(`No strategy found for village ${villageId}. No attacks will be performed.`);
            return [];
        }

        maxPossibleAttacks = Math.min(maxPossibleAttacks, attackableVillages.length);

        if (maxPossibleAttacks === 0) {
            logger.warn('❌ Insufficient troops for mini attacks or no available targets');
            return [];
        }

        logger.log(`📊 Will perform ${maxPossibleAttacks} attacks (limited by min(troops, ${attackableVillages.length} villages))`);

        let currentTargetIndex = attackStrategy.next_target_index || 0;

        if (currentTargetIndex >= attackableVillages.length) {
            currentTargetIndex = 0;
        }

        logger.log(`📍 Starting from target index: ${currentTargetIndex} (village: ${attackableVillages[currentTargetIndex]?.name || 'unknown'})`);

        const attackResults: AttackResult[] = [];
        const startingIndex = currentTargetIndex;
        let attacksPerformed = 0;

        for (let i = 0; i < maxPossibleAttacks; i++) {
            const targetVillage = attackableVillages[currentTargetIndex];
            logger.log(`🎯 Attack ${i + 1}/${maxPossibleAttacks}: Targeting ${targetVillage.name} (${targetVillage.coordinateX}|${targetVillage.coordinateY})`);

            try {
                const lastAttackCheck = await checkLastAttackBeforeExecutionOperation({
                    page,
                    targetVillage,
                    villageId,
                    serverCode,
                    attackUtils,
                    barbarianVillageRepository,
                    logger
                });

                if (!lastAttackCheck.canAttack) {
                    currentTargetIndex = (currentTargetIndex + 1) % attackableVillages.length;
                    await miniAttackStrategiesService.updateNextTargetIndex(serverId, villageId, currentTargetIndex);

                    attackResults.push({
                        success: false,
                        targetVillage: {
                            target: targetVillage.target,
                            name: targetVillage.name,
                            coordinateX: targetVillage.coordinateX,
                            coordinateY: targetVillage.coordinateY,
                            canAttack: targetVillage.canAttack,
                            createdAt: targetVillage.createdAt,
                            updatedAt: targetVillage.updatedAt
                        },
                        error: `Skipped: ${lastAttackCheck.reason}`
                    });

                    continue;
                }

                const attackResult = await executeAttackOnVillageOperation({
                    page,
                    village: targetVillage,
                    armyData,
                    villageId,
                    serverCode,
                    attackUtils,
                    miniAttackStrategiesService,
                    logger,
                    strategy: attackStrategy
                });

                attackResults.push(attackResult);

                if (attackResult.success) {
                    attacksPerformed++;
                    logger.log(`✅ Attack ${i + 1} successful: ${targetVillage.name}`);
                } else {
                    logger.warn(`❌ Attack ${i + 1} failed: ${targetVillage.name} - ${attackResult.error}`);
                    if (attackResult.error === ERROR_MESSAGE_ATTACK_BUTTON_NOT_FOUND || attackResult.error === ERROR_MESSAGE_ATTACK_FORM_NOT_FOUND) {
                        logger.error(`❌ Attack button not found or not visible, stopping attacks for this server`);
                        break;
                    }
                }

                if (attackResult.error && attackResult.error.includes('Village is no longer barbarian')) {
                    await removeBarbarianVillageByTargetOperation(targetVillage.target, {
                        barbarianVillageRepository,
                        logger
                    });
                    logger.log(`🗑️ Deleted village ${targetVillage.name} from database - no longer barbarian`);
                }

                currentTargetIndex = (currentTargetIndex + 1) % attackableVillages.length;
                await miniAttackStrategiesService.updateNextTargetIndex(serverId, villageId, currentTargetIndex);

                if (i < maxPossibleAttacks - 1) {
                    logger.debug('⏳ Waiting 0.3 seconds before next attack...');
                    await page.waitForTimeout(300);
                }

            } catch (attackError) {
                logger.error(`💥 Error during attack ${i + 1} on ${targetVillage.name}:`, attackError);

                currentTargetIndex = (currentTargetIndex + 1) % attackableVillages.length;
                await miniAttackStrategiesService.updateNextTargetIndex(serverId, villageId, currentTargetIndex);

                attackResults.push({
                    success: false,
                    targetVillage: {
                        target: targetVillage.target,
                        name: targetVillage.name,
                        coordinateX: targetVillage.coordinateX,
                        coordinateY: targetVillage.coordinateY,
                        canAttack: targetVillage.canAttack,
                        createdAt: targetVillage.createdAt,
                        updatedAt: targetVillage.updatedAt
                    },
                    error: attackError.message
                });

                continue;
            }
        }

        logger.log(`🗡️ Mini attacks completed: ${attacksPerformed}/${maxPossibleAttacks} successful attacks`);
        logger.log(`📍 Attack sequence: ${startingIndex} → ${currentTargetIndex} (next start point)`);

        const successfulAttacks = attackResults.filter(r => r.success).length;
        const failedAttacks = attackResults.filter(r => !r.success).length;
        logger.log(`📊 Results: ${successfulAttacks} successful, ${failedAttacks} failed, ${attackResults.length} total`);

        return attackResults;

    } finally {
    }
}

