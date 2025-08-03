import { CrawlerService } from '@/crawler/crawler.service';
import { PlemionaCookiesService } from '@/plemiona-cookies';
import { ServersService } from '@/servers';
import { ArmyData, ArmyUtils, UnitData } from '@/utils/army/army.utils';
import { ArmyPage } from '@/utils/army/armyPage/armyPage';
import { PlemionaCredentials } from '@/utils/auth/auth.interfaces';
import { AuthUtils } from '@/utils/auth/auth.utils';
import { createBrowserPage } from '@/utils/browser.utils';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';

@Injectable()
export class ArmyTrainingService {
    private readonly logger = new Logger(ArmyTrainingService.name);
    private readonly credentials: PlemionaCredentials;
    private readonly MAX_IN_QUEUE_LIGHT = 10;

    constructor(
        private readonly serversService: ServersService,
        private readonly plemionaCookiesService: PlemionaCookiesService,
    ) {
    }

    public async getArmyData(villageId: string, serverId: number): Promise<ArmyData> {
        const { page } = await this.createBrowserSession(serverId);
        try {
            const serverCode = await this.serversService.getServerCode(serverId);
            const armyData = await ArmyUtils.getArmyData(page, villageId, serverCode);
            return armyData;
        } catch (error) {
            this.logger.error(`Error getting army data: ${error}`);
            throw new BadRequestException(`Error getting army data: ${error}`);
        } finally {
            await page.close();
        }
    }

    public async startTrainingLight(villageId: string, serverId: number) {
        const MAX_RECRUITMENT_LIGHT = 4;
        const { page } = await this.createBrowserSession(serverId);
        try {
            const serverCode = await this.serversService.getServerCode(serverId);
            const armyPage = new ArmyPage(page);
            await armyPage.goToBuilding(serverCode, villageId, "train");
            const unitsInProduction = await armyPage.getRecruitableUnitsStatus();
            const light = unitsInProduction.find(unit => unit.staticData.dataUnit === 'light');
            if (!light || !light.dynamicData.canRecruit) {
                this.logger.error('❌Light unit not found');
            }
            else if (light.dynamicData.producibleCount && light.dynamicData.producibleCount < MAX_RECRUITMENT_LIGHT) {
                this.logger.error(`❌Light unit cannot recruit more than ${MAX_RECRUITMENT_LIGHT - 1}`);
            }
            else if (light.dynamicData.unitsInQueue && light.dynamicData.unitsInQueue > this.MAX_IN_QUEUE_LIGHT) {
                this.logger.error(`❌Light unit cannot recruit more than ${this.MAX_IN_QUEUE_LIGHT} units in queue`);
            }

            else {
                this.logger.log(`Starting training light: ${light.staticData.name} producible: ${light.dynamicData.producibleCount} queue: ${light.dynamicData.unitsInQueue}`);
                const trainingResult = await ArmyUtils.startTrainingLight(page, villageId, serverCode, light.staticData.dataUnit, MAX_RECRUITMENT_LIGHT);
                return trainingResult;
            }

        } catch (error) {
            this.logger.error(`❌Error starting training light: ${error}`);
            throw new BadRequestException(`Error starting training light: ${error}`);
        } finally {
            await page.close();
        }
    }


    /**
     * Tworzy sesję przeglądarki z zalogowaniem do gry
     * @returns Obiekt z przeglądarką, kontekstem i stroną
     * @throws BadRequestException jeśli logowanie się nie powiodło
     */
    private async createBrowserSession(serverId: number) {
        const { browser, context, page } = await createBrowserPage({ headless: true });
        const serverName = await this.serversService.getServerName(serverId);
        const loginResult = await AuthUtils.loginAndSelectWorld(
            page,
            this.credentials,
            this.plemionaCookiesService,
            serverName
        );

        if (!loginResult.success || !loginResult.worldSelected) {
            await browser.close();
            this.logger.error(`Login failed: ${loginResult.error || 'Unknown error'}`);
            throw new BadRequestException(`Login failed: ${loginResult.error || 'Unknown error'}`);
        }

        return { browser, context, page };
    }

    public async getUnitsInProduction(villageId: string, serverId: number) {
        const { page } = await this.createBrowserSession(serverId);
        try {
            const armyPage = new ArmyPage(page);
            const serverCode = await this.serversService.getServerCode(serverId);
            await armyPage.goToBuilding(serverCode, villageId, "train");
            const unitsInProduction = await armyPage.getRecruitableUnitsStatus();

            return unitsInProduction;
        } catch (error) {

        }
        finally {
            await page.close();
        }
    }
}
