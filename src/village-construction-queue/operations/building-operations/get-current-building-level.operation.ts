import { Page } from 'playwright';
import { VillageDetailPage } from '@/crawler/pages/village-detail.page';

export interface GetCurrentBuildingLevelDependencies {
    logger: any;
}

/**
 * Pobiera aktualny poziom budynku z gry
 * @param serverCode Kod serwera
 * @param buildingId ID budynku
 * @param page Strona przeglądarki
 * @param deps Zależności potrzebne do wykonania operacji
 * @returns Aktualny poziom budynku lub 0 w przypadku błędu
 */
export async function getCurrentBuildingLevelOperation(
    serverCode: string,
    buildingId: string,
    page: Page,
    deps: GetCurrentBuildingLevelDependencies
): Promise<number> {
    const { logger } = deps;
    try {
        const villageDetailPage = new VillageDetailPage(page);
        return await villageDetailPage.getBuildingLevel(serverCode, buildingId);
    } catch (error) {
        logger.warn(`Error getting building level for ${buildingId}:`, error);
        return 0;
    }
}

