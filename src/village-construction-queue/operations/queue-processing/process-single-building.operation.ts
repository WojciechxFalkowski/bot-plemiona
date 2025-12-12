import { Page } from 'playwright';
import { VillageConstructionQueueEntity } from '../../entities/village-construction-queue.entity';
import { VillageDetailPage } from '@/crawler/pages/village-detail.page';
import { navigateToVillageWithRetryOperation, NavigateToVillageWithRetryDependencies } from '../building-operations/navigate-to-village-with-retry.operation';
import { getCurrentBuildingLevelOperation, GetCurrentBuildingLevelDependencies } from '../building-operations/get-current-building-level.operation';
import { extractGameBuildQueueOperation, ExtractGameBuildQueueDependencies } from '../building-operations/extract-game-build-queue.operation';
import { isTargetLevelInGameQueueOperation } from '../building-operations/is-target-level-in-game-queue.operation';
import { attemptToBuildWithRetryOperation, AttemptToBuildWithRetryDependencies } from '../building-operations/attempt-to-build-with-retry.operation';
import { removeFromDatabaseWithReasonOperation, RemoveFromDatabaseWithReasonDependencies } from './remove-from-database-with-reason.operation';

export interface ProcessSingleBuildingDependencies {
    logger: any;
    navigateToVillageWithRetryDeps: NavigateToVillageWithRetryDependencies;
    getCurrentBuildingLevelDeps: GetCurrentBuildingLevelDependencies;
    extractGameBuildQueueDeps: ExtractGameBuildQueueDependencies;
    attemptToBuildWithRetryDeps: AttemptToBuildWithRetryDependencies;
    removeFromDatabaseWithReasonDeps: RemoveFromDatabaseWithReasonDependencies;
}

export interface ProcessSingleBuildingResult {
    success: boolean;
    reason: string;
    shouldDelete: boolean;
}

/**
 * Przetwarza pojedynczy budynek w konkretnej wiosce
 * @param serverCode Kod serwera
 * @param building Budynek do przetworzenia
 * @param page Strona przeglądarki
 * @param deps Zależności potrzebne do wykonania operacji
 * @returns Rezultat przetwarzania
 */
export async function processSingleBuildingOperation(
    serverCode: string,
    building: VillageConstructionQueueEntity,
    page: Page,
    deps: ProcessSingleBuildingDependencies
): Promise<ProcessSingleBuildingResult> {
    const { logger, navigateToVillageWithRetryDeps, getCurrentBuildingLevelDeps, extractGameBuildQueueDeps, attemptToBuildWithRetryDeps, removeFromDatabaseWithReasonDeps } = deps;

    const buildingInfo = `${building.buildingName} L${building.targetLevel} in village ${building.villageId}`;

    try {
        // 1. Nawiguj do wioski z retry mechanism
        logger.debug(`🧭 Navigating to village ${building.villageId}`);
        await navigateToVillageWithRetryOperation(serverCode, building.villageId, page, navigateToVillageWithRetryDeps);

        // 2. Sprawdź aktualny poziom budynku vs target level
        logger.debug(`🔍 Checking current building level for ${building.buildingId}`);
        const currentLevel = await getCurrentBuildingLevelOperation(serverCode, building.buildingId, page, getCurrentBuildingLevelDeps);

        if (building.targetLevel <= currentLevel) {
            logger.log(`✅ ${buildingInfo} - Already built (current: ${currentLevel})`);
            await removeFromDatabaseWithReasonOperation(building.id, 'Already built', removeFromDatabaseWithReasonDeps);
            return { success: true, reason: 'Already built', shouldDelete: true };
        }

        // 3. Sprawdź kolejkę budowy w grze (czy ma miejsce)
        logger.debug(`📋 Checking game build queue capacity`);
        const gameQueue = await extractGameBuildQueueOperation(serverCode, page, extractGameBuildQueueDeps);

        if (gameQueue.length >= 2) {
            logger.log(`⏳ ${buildingInfo} - Game queue full (${gameQueue.length}/2 slots)`);
            return { success: false, reason: 'Game queue full', shouldDelete: false };
        }

        // SPRAWDŹ CZY TARGET LEVEL JUŻ JEST W KOLEJCE GRY
        const targetLevelInQueue = isTargetLevelInGameQueueOperation(building.buildingId, building.targetLevel, gameQueue);

        if (targetLevelInQueue) {
            logger.log(`✅ ${buildingInfo} - Already in game queue`);
            await removeFromDatabaseWithReasonOperation(building.id, 'Already in game queue', removeFromDatabaseWithReasonDeps);
            return { success: true, reason: 'Already in game queue', shouldDelete: true };
        }

        // 4. Sprawdź czy można budować (przycisk vs czas)
        logger.debug(`🔍 Checking if building can be constructed`);
        const villageDetailPage = new VillageDetailPage(page);
        const buildingStatus = await villageDetailPage.checkBuildingBuildAvailability(serverCode, building.buildingId);

        if (buildingStatus.canBuild) {
            // 5. Kliknij przycisk budowania
            logger.log(`🔨 Attempting to build ${buildingInfo}`);
            const buildResult = await attemptToBuildWithRetryOperation(serverCode, buildingStatus.buttonSelector!, page, attemptToBuildWithRetryDeps);

            if (buildResult.success) {
                logger.log(`✅ Successfully added ${buildingInfo} to game queue`);
                await removeFromDatabaseWithReasonOperation(building.id, 'Successfully added', removeFromDatabaseWithReasonDeps);
                return { success: true, reason: 'Successfully added', shouldDelete: true };
            } else {
                logger.warn(`⚠️  Failed to add ${buildingInfo} to queue: ${buildResult.reason}`);
                return { success: false, reason: buildResult.reason, shouldDelete: false };
            }
        } else {
            // 6. Loguj informację o czasie dostępności
            if (buildingStatus.availableAt) {
                logger.log(`⏰ ${buildingInfo} - Resources available at ${buildingStatus.availableAt}`);
            } else {
                logger.log(`❌ ${buildingInfo} - Cannot build (reason: ${buildingStatus.reason})`);
            }
            return { success: false, reason: buildingStatus.reason || 'Cannot build', shouldDelete: false };
        }

    } catch (error) {
        logger.error(`❌ Error processing ${buildingInfo}:`, error);
        return { success: false, reason: `Error: ${error.message}`, shouldDelete: false };
    }
}

