import { Logger } from '@nestjs/common';
import { Page } from 'playwright';
import { AccountManagerCombinedPage, AccountManagerScrapeResult } from '../../pages/account-manager-combined.page';
import { UnitsOverviewPage } from '../../pages/units-overview.page';
import { handleCrawlerErrorOperation } from '../utils/handle-crawler-error.operation';

export interface ScrapeCombinedOverviewDependencies {
    logger: Logger;
    serverId: number;
}

export async function scrapeCombinedOverviewOperation(
    serverCode: string,
    firstVillageId: string,
    page: Page,
    deps: ScrapeCombinedOverviewDependencies
): Promise<AccountManagerScrapeResult> {
    const { logger } = deps;
    const startTime = performance.now();

    try {
        logger.log(`Navigating to Account Manager Combined view starting from village ID: ${firstVillageId}...`);

        const amPage = new AccountManagerCombinedPage(page);
        await amPage.navigate(serverCode, firstVillageId);

        const classification = await handleCrawlerErrorOperation(page, page.url(), {
            operationType: 'Account Manager Scrape',
            serverId: deps.serverId
        });

        if (classification === 'recaptcha_blocked') {
            throw new Error('reCAPTCHA wymaga odblokowania');
        } else if (classification === 'session_expired') {
            throw new Error('Sesja wygasła, wymagane ponowne logowanie');
        }

        logger.log('Extracting combined overview data...');
        const combinedVillages = await amPage.extractCombinedData();
        logger.log(`Extracted combined data for ${combinedVillages.length} villages.`);

        // 2. Visit Units Overview page (mode=units&type=complete) to get TOTAL units (including outside village)
        const unitsPage = new UnitsOverviewPage(page);
        await unitsPage.navigate(serverCode, firstVillageId);

        logger.log('Extracting global units overview data ("razem")...');
        const unitsDataMap = await unitsPage.extractUnitsData();
        logger.log(`Extracted units data for ${unitsDataMap.size} villages.`);

        // Merge unit data into the combined villages data and determine village type
        const villages = combinedVillages.map(v => {
            const totalUnits = unitsDataMap.get(v.villageId);
            if (totalUnits) {
                v.units = totalUnits;
            }

            // Classification Logic
            v.armyTemplateName = '';
            if (v.farmSpace.available >= 1000) {
                const axe = v.units['Topornik'] || 0;
                const spear = v.units['Pikinier'] || 0;
                const sword = v.units['Miecznik'] || 0;
                const archer = v.units['Łucznik'] || 0;
                const heavy = v.units['Ciężki kawalerzysta'] || 0;

                if (spear >= 3000 && heavy >= 100) {
                    v.armyTemplateName = 'defensywna mobilna';
                } else if (spear >= 3000 && (sword >= 1000 || archer >= 1000)) {
                    v.armyTemplateName = 'defensywna';
                } else if (axe >= 1000) {
                    v.armyTemplateName = 'ofensywna';
                }
            }

            return v;
        });

        const executionTimeMs = Math.round(performance.now() - startTime);

        if (villages.length === 0) {
            logger.warn(`No villages data extracted. Menedżer Konta may be inactive or there was a scraping error. Execution time: ${executionTimeMs}ms.`);
        } else {
            logger.log(`Successfully extracted ${villages.length} villages from Combined Overview in ${executionTimeMs}ms.`);
        }

        return {
            executionTimeMs,
            villages
        };

    } catch (error) {
        logger.error(`Error during Account Manager scrape step:`, error);
        throw error;
    }
}
