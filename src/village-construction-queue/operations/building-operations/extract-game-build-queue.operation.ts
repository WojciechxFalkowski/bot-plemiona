import { Page } from 'playwright';
import { VillageDetailPage } from '@/crawler/pages/village-detail.page';
import { BuildQueueItem } from '@/crawler/pages/village-overview.page';

export interface ExtractGameBuildQueueDependencies {
    logger: any;
}

/**
 * Pobiera kolejkę budowy z gry
 * @param serverCode Kod serwera
 * @param page Strona przeglądarki
 * @param deps Zależności potrzebne do wykonania operacji
 * @returns Kolejka budowy z gry
 */
export async function extractGameBuildQueueOperation(
    serverCode: string,
    page: Page,
    deps: ExtractGameBuildQueueDependencies
): Promise<BuildQueueItem[]> {
    const { logger } = deps;
    try {
        const villageDetailPage = new VillageDetailPage(page);
        return await villageDetailPage.extractBuildQueue(serverCode);
    } catch (error) {
        logger.warn('Error extracting game build queue:', error);
        return [];
    }
}

