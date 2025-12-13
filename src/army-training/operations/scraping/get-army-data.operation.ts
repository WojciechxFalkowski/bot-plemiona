import { BadRequestException } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { Browser } from 'playwright';
import { ArmyData, ArmyUtils } from '@/utils/army/army.utils';
import { ServersService } from '@/servers';
import { createBrowserSessionOperation, BrowserSession, CreateBrowserSessionDependencies } from '../browser/create-browser-session.operation';

export interface GetArmyDataDependencies extends CreateBrowserSessionDependencies {
    serversService: ServersService;
    logger: Logger;
}

/**
 * Pobiera dane armii z gry przez scraping
 * @param villageId ID wioski
 * @param serverId ID serwera
 * @param deps Zależności potrzebne do wykonania operacji
 * @returns Dane armii
 * @throws BadRequestException jeśli wystąpi błąd podczas pobierania danych
 */
export async function getArmyDataOperation(
    villageId: string,
    serverId: number,
    deps: GetArmyDataDependencies
): Promise<ArmyData> {
    const { serversService, logger } = deps;
    let browserSession: BrowserSession | null = null;

    try {
        browserSession = await createBrowserSessionOperation(serverId, deps);
        const { browser, page } = browserSession;

        const serverCode = await serversService.getServerCode(serverId);
        const armyData = await ArmyUtils.getArmyData(page, villageId, serverCode);
        return armyData;
    } catch (error) {
        logger.error(`Error getting army data: ${error}`);
        throw new BadRequestException(`Error getting army data: ${error}`);
    } finally {
        if (browserSession?.browser) {
            await browserSession.browser.close();
        }
    }
}


