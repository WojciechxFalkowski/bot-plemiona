import { BadRequestException } from '@nestjs/common';
import { getBuildingConfig } from '@/crawler/pages/village-detail.page';

export interface ValidateBuildingConfigDependencies {
    logger: any;
}

/**
 * Waliduje konfigurację budynku i maksymalny poziom
 * @param buildingId ID budynku do sprawdzenia
 * @param targetLevel Docelowy poziom budynku
 * @param deps Zależności potrzebne do wykonania operacji
 * @returns Konfiguracja budynku jeśli jest poprawna
 * @throws BadRequestException jeśli budynek nie istnieje lub poziom jest za wysoki
 */
export async function validateBuildingConfigOperation(
    buildingId: string,
    targetLevel: number,
    deps: ValidateBuildingConfigDependencies
): Promise<NonNullable<ReturnType<typeof getBuildingConfig>>> {
    const { logger } = deps;
    const buildingConfig = getBuildingConfig(buildingId);
    
    if (!buildingConfig) {
        logger.error(`Building ${buildingId} not found in configuration`);
        throw new BadRequestException(`Building '${buildingId}' is not a valid building ID`);
    }

    if (targetLevel > buildingConfig.maxLevel) {
        logger.error(`Target level ${targetLevel} exceeds max level ${buildingConfig.maxLevel} for building ${buildingId}`);
        throw new BadRequestException(
            `Target level ${targetLevel} exceeds maximum level ${buildingConfig.maxLevel} for building '${buildingConfig.name}'`
        );
    }

    return buildingConfig;
}

