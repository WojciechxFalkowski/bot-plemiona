import { CrawlerService } from '@/crawler/crawler.service';
import { PlemionaCookiesService } from '@/plemiona-cookies';
import { ServersService } from '@/servers';
import { ArmyData, ArmyUtils } from '@/utils/army/army.utils';
import { PlemionaCredentials } from '@/utils/auth/auth.interfaces';
import { AuthUtils } from '@/utils/auth/auth.utils';
import { createBrowserPage } from '@/utils/browser.utils';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';

@Injectable()
export class ArmyTrainingService {
    private readonly logger = new Logger(ArmyTrainingService.name);
    private readonly credentials: PlemionaCredentials;

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
            const armyData = await ArmyUtils.getArmyData(page, villageId, serverCode);

            const light = armyData.units.find(unit => unit.dataUnit === 'light');
            if (!light) {
                throw new BadRequestException('Light unit not found');
            }
            if (light.canRecruit < MAX_RECRUITMENT_LIGHT) {
                throw new BadRequestException(`Light unit cannot recruit more than ${MAX_RECRUITMENT_LIGHT - 1}`);
            }

            const trainingResult = await ArmyUtils.startTrainingLight(page, villageId, serverCode, light, MAX_RECRUITMENT_LIGHT);

            return trainingResult;
        } catch (error) {
            this.logger.error(`Error starting training light: ${error}`);
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
}
