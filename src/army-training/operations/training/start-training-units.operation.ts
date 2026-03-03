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
import { handleCrawlerErrorOperation } from '@/crawler/operations/utils/handle-crawler-error.operation';

export interface StartTrainingUnitsActivityContext {
    logActivity?: (evt: { eventType: string; message: string }) => Promise<void>;
    onRecaptchaBlocked?: (serverId: number) => void;
}

export interface StartTrainingUnitsDependencies extends CreateBrowserSessionDependencies {
    villagesService: VillagesService;
    serversService: ServersService;
    logger: Logger;
    activityContext?: StartTrainingUnitsActivityContext;
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
        const { globalQueueCapPerUnit } = calculateGlobalQueueLimitsOperation(strategy);
        const maxTotalPerUnit = strategy.max_total_per_unit ?? null;

        let anyTrained = false;

        for (const unit of unitsInProduction) {
            const unitKey = unit.staticData.dataUnit;
            const requested = requestedByUnitKey[unitKey] ?? 0;
            if (requested <= 0) continue;
            if (!unit.dynamicData.canRecruit) continue;

            const producible = unit.dynamicData.producibleCount ?? 0;
            const inQueue = unit.dynamicData.unitsInQueue ?? 0;
            const queueRemaining = Math.max(0, globalQueueCapPerUnit - inQueue);
            const currentUnitTotal = (unit.dynamicData.unitsTotal ?? 0) + inQueue;

            const grant = calculateUnitTrainingGrantOperation(requested, producible, inQueue, queueRemaining, maxTotalPerUnit, currentUnitTotal);
            if (grant <= 0) continue;

            logger.log(`⚔️ Training ${grant} of ${unitKey} for village ${villageName.name}`);
            const result = await ArmyUtils.startTrainingUnitOnTrainPage(page, unitKey, grant);
            if (result.success) {
                anyTrained = true;
            } else {
                logger.warn(`Failed to train ${unitKey}: ${result.error}`);
            }
        }

        if (!anyTrained) {
            logger.log(`ℹ️ No units to train for village ${strategy.villageId} after applying constraints`);
            return { success: true, message: 'No units to train' };
        }

        return { success: true };
    } catch (error) {
        logger.error(`❌ Error starting army training for village ${strategy.villageId}:`, error);
        const { activityContext } = deps;
        if (browserSession?.page && activityContext) {
            const classification = await handleCrawlerErrorOperation(
                browserSession.page,
                await browserSession.page.url(),
                {
                    serverId,
                    operationType: 'Army Training',
                    logActivity: activityContext.logActivity,
                    onRecaptchaBlocked: activityContext.onRecaptchaBlocked,
                    errorMessage: `Błąd szkolenia w wiosce ${strategy.villageId}: ${error instanceof Error ? error.message : String(error)}`
                }
            );
            if (classification === 'recaptcha_blocked') {
                throw new Error('reCAPTCHA wymaga odblokowania');
            }
        }
        throw new BadRequestException(`Error starting army training: ${error}`);
    } finally {
        if (browserSession?.browser) {
            await browserSession.browser.close();
        }
    }
}

