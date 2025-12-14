import { BadRequestException } from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { ArmyPage } from '@/utils/army/armyPage/armyPage';
import { UnitDefinition } from '@/utils/army/armyPage/unitDefinitions';
import { ServersService } from '@/servers';
import { createBrowserSessionOperation, BrowserSession, CreateBrowserSessionDependencies } from '../browser/create-browser-session.operation';

export interface GetUnitsInProductionDependencies extends CreateBrowserSessionDependencies {
    serversService: ServersService;
    logger: Logger;
}

/**
 * Pobiera status jednostek w produkcji z gry
 * @param villageId ID wioski
 * @param serverId ID serwera
 * @param deps Zależności potrzebne do wykonania operacji
 * @returns Tablica definicji jednostek w produkcji
 * @throws BadRequestException jeśli wystąpi błąd podczas pobierania danych
 */
export async function getUnitsInProductionOperation(
    villageId: string,
    serverId: number,
    deps: GetUnitsInProductionDependencies
): Promise<ReadonlyArray<UnitDefinition>> {
    const { serversService, logger } = deps;
    let browserSession: BrowserSession | null = null;

    try {
        browserSession = await createBrowserSessionOperation(serverId, deps);
        const { browser, page } = browserSession;

        const armyPage = new ArmyPage(page);
        const serverCode = await serversService.getServerCode(serverId);
        await armyPage.goToBuilding(serverCode, villageId, "train");
        const unitsInProduction = await armyPage.getRecruitableUnitsStatus();

        return unitsInProduction;
    } catch (error) {
        logger.error(`Error getting units in production: ${error}`);
        throw new BadRequestException(`Error getting units in production: ${error}`);
    } finally {
        if (browserSession?.browser) {
            await browserSession.browser.close();
        }
    }
}



