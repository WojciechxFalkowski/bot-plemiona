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
            await armyPage.goToBuilding(serverCode, villageName.id, "train");

            const unitsInProduction = await armyPage.getRecruitableUnitsStatus();
            const formattedTable = this.formatUnitsInProductionTable(unitsInProduction, villageName.name, strategy);
            this.logger.log(formattedTable);

            // Global limits enforcement (current implementation acts only on 'light')
            if (strategy.light > 0) {
                const light = unitsInProduction.find(unit => unit.staticData.dataUnit === 'light');
                if (!light || !light.dynamicData.canRecruit) {
                    this.logger.error('❌ Light unit not found or cannot recruit');
                    return { success: false, error: 'Light unit not available for training' };
                }

                // Compute global current total across all units in the list
                const currentTotalAllUnits = unitsInProduction.reduce((sum, u) => sum + (u.dynamicData?.unitsTotal ?? 0) + (u.dynamicData?.unitsInQueue ?? 0), 0);
                const maxTotalOverall = strategy.max_total_overall ?? Number.POSITIVE_INFINITY;
                const remainingByMaxTotal = Math.max(0, maxTotalOverall - currentTotalAllUnits);

                const globalQueueCapPerUnit = strategy.max_in_queue_per_unit_overall ?? 10;
                const inQueueLight = light.dynamicData?.unitsInQueue ?? 0;
                const queueCapRemainingForLight = Math.max(0, globalQueueCapPerUnit - inQueueLight);

                const producibleLight = light.dynamicData?.producibleCount ?? 0;
                const requestedLight = strategy.light;

                const toRecruit = Math.min(requestedLight, producibleLight, queueCapRemainingForLight, remainingByMaxTotal);

                if (toRecruit <= 0) {
                    this.logger.log(`⛔ Skipping training: constraints hit (requested=${requestedLight}, producible=${producibleLight}, queueCapRemaining=${queueCapRemainingForLight}, remainingByMaxTotal=${remainingByMaxTotal})`);
                    return { success: true, message: 'No units to train due to constraints' };
                }

                this.logger.log(`⚔️ Starting training of ${toRecruit} light units for village ${villageName.name}`);
                const trainingResult = await this.startTrainingLight(page, villageName.name, serverId, light, toRecruit);
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
    /**
     * Formats the recruitable units status into a compact monospace table for logs
     */
    private formatUnitsInProductionTable(units: ReadonlyArray<UnitDefinition>, villageDisplayName: string, strategy?: ArmyTrainingStrategyResponseDto): string {
        if (!units || units.length === 0) {
            return `📋 Units in production for ${villageDisplayName}\n(No recruitable units found)`;
        }

        type Row = {
            unit: string;
            code: string;
            inVillage: string | number;
            outside: string | number;
            total: string | number;
            canRecruit: string;
            producible: string;
            inQueue: string;
            queueCapRemaining: string;
        };

        const globalQueueCapPerUnit = strategy?.max_in_queue_per_unit_overall ?? 10;

        const rows: Row[] = units.map((u: UnitDefinition) => ({
            unit: u.staticData?.name ?? '-',
            code: u.staticData?.dataUnit ?? '-',
            inVillage: u.dynamicData?.unitsInVillage ?? '-',
            outside: u.dynamicData?.unitsOutside ?? '-',
            total: u.dynamicData?.unitsTotal ?? '-',
            canRecruit: u.dynamicData?.canRecruit ? 'YES' : 'NO',
            producible: String(u.dynamicData?.producibleCount ?? 0),
            inQueue: String(u.dynamicData?.unitsInQueue ?? 0),
            queueCapRemaining: String(Math.max(0, globalQueueCapPerUnit - (u.dynamicData?.unitsInQueue ?? 0))),
        }));

        const headers: Row = {
            unit: 'Unit',
            code: 'Code',
            inVillage: 'InVillage',
            outside: 'Outside',
            total: 'Total',
            canRecruit: 'CanRecruit',
            producible: 'Producible',
            inQueue: 'InQueue',
            queueCapRemaining: 'QueueCapRemaining',
        };

        const getWidth = (key: keyof Row): number => {
            const headerLen = headers[key].toString().length;
            const dataMax = rows.reduce((max: number, r: Row) => Math.max(max, r[key].toString().length), 0);
            return Math.max(headerLen, dataMax);
        };

        const widths = {
            unit: getWidth('unit'),
            code: getWidth('code'),
            inVillage: getWidth('inVillage'),
            outside: getWidth('outside'),
            total: getWidth('total'),
            canRecruit: getWidth('canRecruit'),
            producible: getWidth('producible'),
            inQueue: getWidth('inQueue'),
            queueCapRemaining: getWidth('queueCapRemaining'),
        } as const;

        const pad = (text: string, width: number): string => text.padEnd(width, ' ');

        const headerLine = `${pad(headers.unit, widths.unit)}  ${pad(headers.code, widths.code)}  ${pad(headers.inVillage.toString(), widths.inVillage)}  ${pad(headers.outside.toString(), widths.outside)}  ${pad(headers.total.toString(), widths.total)}  ${pad(headers.canRecruit, widths.canRecruit)}  ${pad(headers.producible, widths.producible)}  ${pad(headers.inQueue, widths.inQueue)}  ${pad(headers.queueCapRemaining, widths.queueCapRemaining)}`;
        const sepLine = `${'-'.repeat(widths.unit)}  ${'-'.repeat(widths.code)}  ${'-'.repeat(widths.inVillage)}  ${'-'.repeat(widths.outside)}  ${'-'.repeat(widths.total)}  ${'-'.repeat(widths.canRecruit)}  ${'-'.repeat(widths.producible)}  ${'-'.repeat(widths.inQueue)}  ${'-'.repeat(widths.queueCapRemaining)}`;
        const dataLines = rows
            .map((r: Row) => `${pad(r.unit, widths.unit)}  ${pad(r.code, widths.code)}  ${pad(r.inVillage.toString(), widths.inVillage)}  ${pad(r.outside.toString(), widths.outside)}  ${pad(r.total.toString(), widths.total)}  ${pad(r.canRecruit, widths.canRecruit)}  ${pad(r.producible, widths.producible)}  ${pad(r.inQueue, widths.inQueue)}  ${pad(r.queueCapRemaining, widths.queueCapRemaining)}`)
            .join('\n');

        // Global header context
        const currentTotalAllUnits = units.reduce((sum, u) => sum + (u.dynamicData?.unitsInVillage ?? 0) + (u.dynamicData?.unitsInQueue ?? 0), 0);
        const maxTotalOverall = strategy?.max_total_overall ?? '∞';
        const remainingByMaxTotal = typeof strategy?.max_total_overall === 'number' ? Math.max(0, strategy.max_total_overall - currentTotalAllUnits) : '∞';

        return [
            `📋 Units in production for ${villageDisplayName} | MaxTotalOverall=${maxTotalOverall} | CurrentTotal=${currentTotalAllUnits} | Remaining=${remainingByMaxTotal} | MaxInQueuePerUnit=${globalQueueCapPerUnit}`,
            '```',
            headerLine,
            sepLine,
            dataLines,
            '```',
        ].join('\n');
    }
}
