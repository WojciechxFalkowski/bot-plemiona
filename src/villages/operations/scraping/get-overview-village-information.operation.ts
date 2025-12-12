import { Browser } from 'playwright';
import { createBrowserPage } from '@/utils/browser.utils';
import { AuthUtils } from '@/utils/auth/auth.utils';
import { PlemionaCredentials } from '@/utils/auth/auth.interfaces';
import { PlemionaCookiesService } from '@/plemiona-cookies';
import { ServersService } from '@/servers';
import { ProfilePage, BasicVillageData } from '@/crawler/pages/profile.page';

export interface GetOverviewVillageInformationDependencies {
    logger: any;
    serversService: ServersService;
    credentials: PlemionaCredentials;
    plemionaCookiesService: PlemionaCookiesService;
}

/**
 * Pobiera podstawowe informacje o wioskach z gry (szybka metoda)
 * @param serverId ID serwera
 * @param options Opcje zbierania danych
 * @param deps Zależności potrzebne do wykonania operacji
 * @returns Promise z podstawowymi danymi wiosek
 */
export async function getOverviewVillageInformationOperation(
    serverId: number,
    options: {
        headless?: boolean;
        timeoutPerPage?: number;
        saveToDatabase?: boolean;
    },
    deps: GetOverviewVillageInformationDependencies
): Promise<BasicVillageData[]> {
    const { logger, serversService, credentials, plemionaCookiesService } = deps;
    const { headless = true, timeoutPerPage = 15000, saveToDatabase = true } = options;

    logger.log('Starting basic village information collection...');
    const { browser, context, page } = await createBrowserPage({ headless });

    try {
        const server = await serversService.findById(serverId);
        // Zaloguj się i wybierz świat
        const loginResult = await AuthUtils.loginAndSelectWorld(
            page,
            credentials,
            plemionaCookiesService,
            server.serverName
        );

        if (!loginResult.success) {
            throw new Error(`Login failed: ${loginResult.error}`);
        }

        // Użyj ProfilePage do zbierania podstawowych danych (działa bez premium)
        const collectionResult = await ProfilePage.collectVillageInformationFromProfile(
            page,
            server.serverCode,
            { timeoutPerPage }
        );

        if (collectionResult.success) {
            logger.log(`Successfully collected basic data for ${collectionResult.villagesProcessed} villages`);
            return collectionResult.data;
        } else {
            logger.error('Failed to collect basic village information');
            if (collectionResult.errors.length > 0) {
                collectionResult.errors.forEach(error => {
                    logger.error(`Error in village ${error.villageName}: ${error.error}`);
                });
            }
            return [];
        }

    } catch (error) {
        logger.error('Error during basic village information collection:', error);
        return [];
    } finally {
        // Zamknij przeglądarkę
        if (browser) {
            await browser.close();
            logger.log('Browser closed after basic village information collection.');
        }
    }
}

