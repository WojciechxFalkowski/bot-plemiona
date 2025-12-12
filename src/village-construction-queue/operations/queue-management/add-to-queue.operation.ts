import { BadRequestException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { VillageConstructionQueueEntity } from '../../entities/village-construction-queue.entity';
import { VillageEntity } from '@/villages/entities/village.entity';
import { CreateConstructionQueueDto } from '../../dto/create-construction-queue.dto';
import { validateVillageExistsOperation, ValidateVillageExistsDependencies } from '../validation/validate-village-exists.operation';
import { validateBuildingConfigOperation, ValidateBuildingConfigDependencies } from '../validation/validate-building-config.operation';
import { validateNoDuplicateInQueueOperation, ValidateNoDuplicateInQueueDependencies } from '../validation/validate-no-duplicate-in-queue.operation';
import { canSkipPlaywrightValidationOperation, CanSkipPlaywrightValidationDependencies } from '../validation/can-skip-playwright-validation.operation';
import { validateBuildingRequirementsOperation, ValidateBuildingRequirementsDependencies } from '../validation/validate-building-requirements.operation';
import { validateLevelContinuityOperation, ValidateLevelContinuityDependencies } from '../validation/validate-level-continuity.operation';
import { createBrowserSessionOperation, CreateBrowserSessionDependencies } from '../browser/create-browser-session.operation';
import { createQueueItemOperation, CreateQueueItemDependencies } from './create-queue-item.operation';
import { ServersService } from '@/servers';

export interface AddToQueueDependencies {
    logger: any;
    validateVillageExistsDeps: ValidateVillageExistsDependencies;
    validateBuildingConfigDeps: ValidateBuildingConfigDependencies;
    validateNoDuplicateInQueueDeps: ValidateNoDuplicateInQueueDependencies;
    canSkipPlaywrightValidationDeps: CanSkipPlaywrightValidationDependencies;
    validateBuildingRequirementsDeps: ValidateBuildingRequirementsDependencies;
    validateLevelContinuityDeps: ValidateLevelContinuityDependencies;
    createBrowserSessionDeps: CreateBrowserSessionDependencies;
    createQueueItemDeps: CreateQueueItemDependencies;
    serversService: ServersService;
}

/**
 * Dodaje budynek do kolejki budowy z pełną walidacją
 * @param dto Dane budynku do dodania
 * @param deps Zależności potrzebne do wykonania operacji
 * @returns Utworzony wpis w kolejce
 */
export async function addToQueueOperation(
    dto: CreateConstructionQueueDto,
    deps: AddToQueueDependencies
): Promise<VillageConstructionQueueEntity> {
    const { 
        logger, 
        validateVillageExistsDeps, 
        validateBuildingConfigDeps, 
        validateNoDuplicateInQueueDeps,
        canSkipPlaywrightValidationDeps,
        validateBuildingRequirementsDeps,
        validateLevelContinuityDeps,
        createBrowserSessionDeps,
        createQueueItemDeps,
        serversService
    } = deps;

    logger.log(`Adding building to queue: ${dto.buildingId} level ${dto.targetLevel} for village ${dto.villageId}`);

    // === PODSTAWOWA WALIDACJA (bez scrappowania) ===

    // 1. Sprawdź czy wioska istnieje
    const village = await validateVillageExistsOperation(dto.villageId, validateVillageExistsDeps);

    // 2. Sprawdź czy budynek istnieje w konfiguracji i targetLevel nie przekracza maksimum
    const buildingConfig = await validateBuildingConfigOperation(dto.buildingId, dto.targetLevel, validateBuildingConfigDeps);

    // 3. Sprawdź czy nie ma już takiego samego wpisu w kolejce
    await validateNoDuplicateInQueueOperation(dto.villageId, dto.buildingId, dto.targetLevel, buildingConfig.name, validateNoDuplicateInQueueDeps);

    // === OPTYMALIZACJA: Sprawdź czy można pominąć walidację Playwright ===
    const canSkipValidation = await canSkipPlaywrightValidationOperation(
        dto.serverId,
        dto.villageId,
        dto.buildingId,
        dto.targetLevel,
        canSkipPlaywrightValidationDeps
    );

    // === ZAAWANSOWANA WALIDACJA (z scrappowaniem) ===

    if (!canSkipValidation) {
        // 4. Stwórz sesję przeglądarki do scrappowania danych z gry
        const { browser, context, page } = await createBrowserSessionOperation(dto.serverId, createBrowserSessionDeps);

        try {
            // 5. Sprawdź wymagania budynku używając danych z gry
            await validateBuildingRequirementsOperation(dto.villageId, dto.buildingId, dto.serverId, page, validateBuildingRequirementsDeps);

            // 6. Sprawdź ciągłość poziomów (gra + budowa + baza)
            const serverCode = await serversService.findById(dto.serverId).then(server => server.serverCode);

            await validateLevelContinuityOperation(
                dto.serverId,
                serverCode,
                dto.villageId,
                dto.buildingId,
                dto.targetLevel,
                buildingConfig.name,
                page,
                validateLevelContinuityDeps
            );

        } finally {
            // Zawsze zamykaj przeglądarkę
            await browser.close();
        }
    } else {
        logger.log(`Skipping Playwright validation - previous level found in queue for ${buildingConfig.name} level ${dto.targetLevel} in village ${dto.villageId}`);
    }

    // === TWORZENIE WPISU ===

    // 7. Utwórz nowy wpis w kolejce
    return await createQueueItemOperation(dto, buildingConfig, village, createQueueItemDeps);
}

