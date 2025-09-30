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

            // Generic training across all units requested in strategy
            const requestedByUnitKey: Record<string, number> = {
                spear: strategy.spear ?? 0,
                sword: strategy.sword ?? 0,
                axe: strategy.axe ?? 0,
                archer: strategy.archer ?? 0,
                spy: strategy.spy ?? 0,
                light: strategy.light ?? 0,
                marcher: strategy.marcher ?? 0,
                heavy: strategy.heavy ?? 0,
                ram: strategy.ram ?? 0,
                catapult: strategy.catapult ?? 0,
                knight: strategy.knight ?? 0,
                snob: strategy.snob ?? 0,
            };

            // Oblicz globalne ograniczenia (startowo z istniejącego stanu)
            let remainingByMaxTotal = Math.max(0, (strategy.max_total_overall ?? Number.POSITIVE_INFINITY) -
                unitsInProduction.reduce((sum, u) => sum + (u.dynamicData?.unitsTotal ?? 0) + (u.dynamicData?.unitsInQueue ?? 0), 0));
            const globalQueueCapPerUnit = strategy.max_in_queue_per_unit_overall ?? 10;

            let anyTrained = false;

            for (const unit of unitsInProduction) {
                const unitKey = unit.staticData.dataUnit; // np. 'light'
                const requested = requestedByUnitKey[unitKey] ?? 0;
                if (requested <= 0) continue;
                if (!unit.dynamicData.canRecruit) continue;

                const producible = unit.dynamicData.producibleCount ?? 0;
                const inQueue = unit.dynamicData.unitsInQueue ?? 0;
                const queueRemaining = Math.max(0, globalQueueCapPerUnit - inQueue);

                const grant = Math.min(requested, producible, queueRemaining, remainingByMaxTotal);
                if (grant <= 0) continue;

                this.logger.log(`⚔️ Training ${grant} of ${unitKey} for village ${villageName.name}`);
                const result = await ArmyUtils.startTrainingUnitOnTrainPage(page, unitKey, grant);
                if (result.success) {
                    anyTrained = true;
                    remainingByMaxTotal = Math.max(0, remainingByMaxTotal - grant);
                } else {
                    this.logger.warn(`Failed to train ${unitKey}: ${result.error}`);
                }

                if (remainingByMaxTotal <= 0) {
                    this.logger.log('Reached global max_total_overall limit; stopping further recruitment');
                    break;
                }
            }

            if (!anyTrained) {
                this.logger.log(`ℹ️ No units to train for village ${strategy.villageId} after applying constraints`);
                return { success: true, message: 'No units to train' };
            }

            return { success: true };

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
