import { CrawlerService } from '@/crawler/crawler.service';
import { PlemionaCookiesService } from '@/plemiona-cookies';
import { ServersService } from '@/servers';
import { ArmyData, ArmyUtils, UnitData } from '@/utils/army/army.utils';
import { ArmyPage } from '@/utils/army/armyPage/armyPage';
import { PlemionaCredentials } from '@/utils/auth/auth.interfaces';
import { AuthUtils } from '@/utils/auth/auth.utils';
import { createBrowserPage } from '@/utils/browser.utils';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ArmyTrainingStrategyResponseDto } from './dto/army-training-strategy-response.dto';
import { UnitDefinition } from '@/utils/army/armyPage/unitDefinitions';
import { Page } from 'playwright';
import { VillagesService } from '@/villages/villages.service';

@Injectable()
export class ArmyTrainingService {
    private readonly logger = new Logger(ArmyTrainingService.name);
    private readonly credentials: PlemionaCredentials;
    private readonly MAX_IN_QUEUE_LIGHT = 10;

    constructor(
        private readonly serversService: ServersService,
        private readonly plemionaCookiesService: PlemionaCookiesService,
        private readonly villagesService: VillagesService,
    ) {
    }

    public async getArmyData(villageId: string, serverId: number): Promise<ArmyData> {
        const { browser, page } = await this.createBrowserSession(serverId);
        try {
            const serverCode = await this.serversService.getServerCode(serverId);
            const armyData = await ArmyUtils.getArmyData(page, villageId, serverCode);
            return armyData;
        } catch (error) {
            this.logger.error(`Error getting army data: ${error}`);
            throw new BadRequestException(`Error getting army data: ${error}`);
        } finally {
            if (browser) {
                await browser.close();
            }
        }
    }

    public async startTrainingLight(page: Page, villageId: string, serverId: number, lightUnit: UnitDefinition | undefined, maxRecruitment: number = 4) {
        try {
            const serverCode = await this.serversService.getServerCode(serverId);

            if (!lightUnit || !lightUnit.dynamicData.canRecruit) {
                this.logger.error('❌Light unit not found');
                return { success: false, error: 'Light unit not found or cannot recruit' };
            }
            else if (!lightUnit.dynamicData.producibleCount || lightUnit.dynamicData.producibleCount < maxRecruitment) {
                this.logger.error(`❌Light unit cannot recruit ${maxRecruitment} units`);
                return { success: false, error: `Light unit cannot recruit ${maxRecruitment} units` };
            }
            else if (lightUnit.dynamicData.unitsInQueue && lightUnit.dynamicData.unitsInQueue > this.MAX_IN_QUEUE_LIGHT) {
                this.logger.error(`❌Light unit cannot recruit more than ${this.MAX_IN_QUEUE_LIGHT} units in queue`);
                return { success: false, error: `Light unit cannot recruit more than ${this.MAX_IN_QUEUE_LIGHT} units in queue` };
            }

            this.logger.log(`Starting training light: ${lightUnit.staticData.name} producible: ${lightUnit.dynamicData.producibleCount} queue: ${lightUnit.dynamicData.unitsInQueue}`);
            const trainingResult = await ArmyUtils.startTrainingLight(page, villageId, serverCode, lightUnit.staticData.dataUnit, maxRecruitment);
            return trainingResult;

        } catch (error) {
            this.logger.error(`❌Error starting training light: ${error}`);
            throw new BadRequestException(`Error starting training light: ${error}`);
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
        const { browser, page } = await this.createBrowserSession(serverId);
        try {
            const armyPage = new ArmyPage(page);
            const serverCode = await this.serversService.getServerCode(serverId);
            await armyPage.goToBuilding(serverCode, villageId, "train");
            const unitsInProduction = await armyPage.getRecruitableUnitsStatus();

            return unitsInProduction;
        } catch (error) {
            this.logger.error(`Error getting units in production: ${error}`);
            throw new BadRequestException(`Error getting units in production: ${error}`);
        } finally {
            if (browser) {
                await browser.close();
            }
        }
    }

    /**
     * Rozpoczyna trening jednostek zgodnie ze strategią
     * @param strategy - strategia treningu jednostek
     * @param serverId - ID serwera
     * @returns wynik treningu
     */
    public async startTrainingUnits(strategy: ArmyTrainingStrategyResponseDto, serverId: number) {
        const villageName = await this.villagesService.findById(serverId, strategy.villageId);
        this.logger.log(`🚀 Starting army training for village ${strategy.villageId} on server ${serverId}`);

        const { browser, page } = await this.createBrowserSession(serverId);
        try {
            const serverCode = await this.serversService.getServerCode(serverId);
            const armyPage = new ArmyPage(page);
            await armyPage.goToBuilding(serverCode, villageName.name, "train");

            const unitsInProduction = await armyPage.getRecruitableUnitsStatus();
            this.logger.log(`📋 Units in production status for village ${villageName.name}:`, unitsInProduction);

            // Na razie tylko wywołujemy startTrainingLight dla lekkiej kawalerii
            // TODO: Rozszerzyć o inne jednostki w przyszłości
            if (strategy.light > 0) {
                const light = unitsInProduction.find(unit => unit.staticData.dataUnit === 'light');
                if (!light || !light.dynamicData.canRecruit) {
                    this.logger.error('❌ Light unit not found or cannot recruit');
                    return { success: false, error: 'Light unit not available for training' };
                }

                const maxRecruitment = Math.min(strategy.light, 4); // Maksymalnie 4 na raz
                this.logger.log(`⚔️ Starting training of ${maxRecruitment} light units for village ${villageName.name}`);

                const trainingResult = await this.startTrainingLight(page, villageName.name, serverId, light, maxRecruitment);

                this.logger.log(`✅ Light unit training completed for village ${villageName.name}`);
                return trainingResult;
            }

            this.logger.log(`ℹ️ No light units to train for village ${strategy.villageId}`);
            return { success: true, message: 'No units to train' };

        } catch (error) {
            this.logger.error(`❌ Error starting army training for village ${strategy.villageId}:`, error);
            throw new BadRequestException(`Error starting army training: ${error}`);
        } finally {
            if (browser) {
                await browser.close();
            }
        }
    }
}
