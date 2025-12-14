import { BadRequestException } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { Page } from 'playwright';
import { ArmyUtils } from '@/utils/army/army.utils';
import { UnitDefinition } from '@/utils/army/armyPage/unitDefinitions';
import { ServersService } from '@/servers';
import { validateLightUnitCanTrainOperation, ValidateLightUnitCanTrainDependencies } from '../validation/validate-light-unit-can-train.operation';

export interface StartTrainingLightDependencies extends ValidateLightUnitCanTrainDependencies {
    serversService: ServersService;
}

export interface StartTrainingLightResult {
    success: boolean;
    error?: string;
}

/**
 * Rozpoczyna trening lekkich jednostek
 * @param page Strona przeglądarki
 * @param villageId ID wioski
 * @param serverId ID serwera
 * @param lightUnit Definicja lekkiej jednostki
 * @param maxRecruitment Maksymalna liczba jednostek do zrekrutowania
 * @param maxInQueue Maksymalna liczba jednostek w kolejce
 * @param deps Zależności potrzebne do wykonania operacji
 * @returns Wynik treningu
 * @throws BadRequestException jeśli wystąpi błąd podczas treningu
 */
export async function startTrainingLightOperation(
    page: Page,
    villageId: string,
    serverId: number,
    lightUnit: UnitDefinition | undefined,
    maxRecruitment: number,
    maxInQueue: number,
    deps: StartTrainingLightDependencies
): Promise<StartTrainingLightResult> {
    const { serversService, logger } = deps;

    try {
        const serverCode = await serversService.getServerCode(serverId);

        const validationResult = validateLightUnitCanTrainOperation(lightUnit, maxRecruitment, maxInQueue, deps);
        if (!validationResult.canTrain) {
            return { success: false, error: validationResult.error };
        }

        logger.log(`Starting training light: ${lightUnit!.staticData.name} producible: ${lightUnit!.dynamicData.producibleCount} queue: ${lightUnit!.dynamicData.unitsInQueue}`);
        const trainingResult = await ArmyUtils.startTrainingLight(page, villageId, serverCode, lightUnit!.staticData.dataUnit, maxRecruitment);
        return trainingResult;
    } catch (error) {
        logger.error(`❌Error starting training light: ${error}`);
        throw new BadRequestException(`Error starting training light: ${error}`);
    }
}



