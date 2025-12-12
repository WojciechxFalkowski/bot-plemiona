import { Page } from 'playwright';
import { VillageDetailPage } from '@/crawler/pages/village-detail.page';

export interface NavigateToVillageWithRetryDependencies {
    logger: any;
    maxRetries: number;
}

/**
 * Nawiguje do wioski z mechanizmem retry
 * @param serverCode Kod serwera
 * @param villageId ID wioski
 * @param page Strona przeglądarki
 * @param deps Zależności potrzebne do wykonania operacji
 */
export async function navigateToVillageWithRetryOperation(
    serverCode: string,
    villageId: string,
    page: Page,
    deps: NavigateToVillageWithRetryDependencies
): Promise<void> {
    const { logger, maxRetries } = deps;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const villageDetailPage = new VillageDetailPage(page);
            await villageDetailPage.navigateToVillage(serverCode, villageId);
            return; // Success
        } catch (error) {
            logger.warn(`Navigation attempt ${attempt}/${maxRetries} failed for village ${villageId}:`, error);
            if (attempt === maxRetries) {
                throw error;
            }
            await page.waitForTimeout(1000); // Wait 1 second before retry
        }
    }
}

