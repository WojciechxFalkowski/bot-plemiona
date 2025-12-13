import { BadRequestException } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { ArmyUtils } from '@/utils/army/army.utils';
import { ArmyPage } from '@/utils/army/armyPage/armyPage';
import { ArmyTrainingStrategyResponseDto } from '../../dto/army-training-strategy-response.dto';
import { VillagesService } from '@/villages/villages.service';
import { ServersService } from '@/servers';
import { createBrowserSessionOperation, BrowserSession, CreateBrowserSessionDependencies } from '../browser/create-browser-session.operation';
import { formatUnitsInProductionTableOperation } from '../data-transformation/format-units-in-production-table.operation';
import { calculateRequestedUnitsByKeyOperation } from '../calculations/calculate-requested-units-by-key.operation';
import { calculateGlobalQueueLimitsOperation } from '../calculations/calculate-global-queue-limits.operation';
import { calculateUnitTrainingGrantOperation } from '../calculations/calculate-unit-training-grant.operation';

export interface StartTrainingUnitsDependencies extends CreateBrowserSessionDependencies {
    villagesService: VillagesService;
    serversService: ServersService;
    logger: Logger;
}

export interface StartTrainingUnitsResult {
    success: boolean;
    message?: string;
}

/**
 * Główna logika treningu jednostek zgodnie ze strategią
 * @param strategy Strategia treningu jednostek
 * @param serverId ID serwera
 * @param deps Zależności potrzebne do wykonania operacji
 * @returns Wynik treningu
 * @throws BadRequestException jeśli wystąpi błąd podczas treningu
 */
export async function startTrainingUnitsOperation(
    strategy: ArmyTrainingStrategyResponseDto,
    serverId: number,
    deps: StartTrainingUnitsDependencies
): Promise<StartTrainingUnitsResult> {
    const { villagesService, serversService, logger } = deps;
    let browserSession: BrowserSession | null = null;

    try {
        const villageName = await villagesService.findById(serverId, strategy.villageId);
        logger.log(`🚀 Starting army training for village ${strategy.villageId} on server ${serverId}`);

        browserSession = await createBrowserSessionOperation(serverId, deps);
        const { browser, page } = browserSession;

        const serverCode = await serversService.getServerCode(serverId);
        const armyPage = new ArmyPage(page);
        await armyPage.goToBuilding(serverCode, villageName.id, "train");

        const unitsInProduction = await armyPage.getRecruitableUnitsStatus();
        const formattedTable = formatUnitsInProductionTableOperation(unitsInProduction, villageName.name, strategy);
        logger.log(formattedTable);

        const requestedByUnitKey = calculateRequestedUnitsByKeyOperation(strategy);
        const { remainingByMaxTotal: initialRemainingByMaxTotal, globalQueueCapPerUnit } = calculateGlobalQueueLimitsOperation(unitsInProduction, strategy);

        let remainingByMaxTotal = initialRemainingByMaxTotal;
        let anyTrained = false;

        for (const unit of unitsInProduction) {
            const unitKey = unit.staticData.dataUnit;
            const requested = requestedByUnitKey[unitKey] ?? 0;
            if (requested <= 0) continue;
            if (!unit.dynamicData.canRecruit) continue;

            const producible = unit.dynamicData.producibleCount ?? 0;
            const inQueue = unit.dynamicData.unitsInQueue ?? 0;
            const queueRemaining = Math.max(0, globalQueueCapPerUnit - inQueue);

            const grant = calculateUnitTrainingGrantOperation(requested, producible, inQueue, queueRemaining, remainingByMaxTotal);
            if (grant <= 0) continue;

            logger.log(`⚔️ Training ${grant} of ${unitKey} for village ${villageName.name}`);
            const result = await ArmyUtils.startTrainingUnitOnTrainPage(page, unitKey, grant);
            if (result.success) {
                anyTrained = true;
                remainingByMaxTotal = Math.max(0, remainingByMaxTotal - grant);
            } else {
                logger.warn(`Failed to train ${unitKey}: ${result.error}`);
            }

            if (remainingByMaxTotal <= 0) {
                logger.log('Reached global max_total_overall limit; stopping further recruitment');
                break;
            }
        }

        if (!anyTrained) {
            logger.log(`ℹ️ No units to train for village ${strategy.villageId} after applying constraints`);
            return { success: true, message: 'No units to train' };
        }

        return { success: true };
    } catch (error) {
        logger.error(`❌ Error starting army training for village ${strategy.villageId}:`, error);
        throw new BadRequestException(`Error starting army training: ${error}`);
    } finally {
        if (browserSession?.browser) {
            await browserSession.browser.close();
        }
    }
}

