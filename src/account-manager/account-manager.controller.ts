import { Controller, Get, Post, Logger, Param, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags, ApiParam } from '@nestjs/swagger';
import { CrawlerService } from '../crawler/crawler.service';

@ApiTags('Account Manager')
@Controller('account-manager')
export class AccountManagerController {
    private readonly logger = new Logger(AccountManagerController.name);

    constructor(
        private readonly crawlerService: CrawlerService
    ) { }

    /**
     * Test endpoint for triggering the Account Manager Combined scraping process.
     * Starts a headless browser session, logs in, iterates over villages 
     * and maps production, farm, recruitment and unit columns.
     */
    @Get('scrape/:serverId')
    @ApiOperation({
        summary: 'Pobierz dane z Menedżera Konta (widok Kombinowany)',
        description: 'Uruchamia scraper pobierający statusy rozbudowy, rekrutacji oraz jednostki dla wszystkich wiosek.'
    })
    @ApiParam({
        name: 'serverId',
        description: 'ID serwera',
        type: Number,
        example: 1
    })
    @ApiResponse({
        status: 200,
        description: 'Pomyślnie zescrapowano dane',
        schema: {
            type: 'object',
            properties: {
                executionTimeMs: { type: 'number', description: 'Czas wykonywania operacji w milisekundach' },
                villages: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            villageId: { type: 'number', description: 'ID wioski' },
                            villageName: { type: 'string', description: 'Nazwa wioski' },
                            isBuilding: { type: 'boolean', description: 'Czy uruchomiono budowę (Ratusz)' },
                            isRecruiting: { type: 'boolean', description: 'Czy uruchomiono rekrutację (Koszary/Stajnia)' },
                            farmSpace: {
                                type: 'object',
                                properties: {
                                    available: { type: 'number' },
                                    maxLevel: { type: 'number' }
                                }
                            },
                            units: {
                                type: 'object',
                                description: 'Dynamicznie zmapowane jednostki i ich ilości'
                            }
                        }
                    }
                }
            }
        }
    })
    @ApiResponse({ status: 500, description: 'Internal server error during scraping' })
    public async scrapeCombinedData(@Param('serverId') serverId: number) {
        try {
            this.logger.log(`Manual trigger requested for Account Manager scrape on server ID: ${serverId}`);

            if (!serverId || isNaN(Number(serverId))) {
                throw new BadRequestException('Invalid serverId parameter');
            }

            const result = await this.crawlerService.getAccountManagerCombinedData(Number(serverId));

            this.logger.log(`Successfully completed manual trigger scrape. Returned ${result.villages.length} villages in ${result.executionTimeMs}ms.`);

            return result;

        } catch (error) {
            this.logger.error(`Error during manual scrape trigger: ${error.message}`, error.stack);
            throw new InternalServerErrorException(`Failed to extract Account Manager data: ${error.message}`);
        }
    }

    /**
     * Test endpoint for assigning troop templates based on armyTemplateName.
     * Starts a headless browser session, logs in, extracts all village info, 
     * filters, and automatically checks and assigns army templates to villages.
     */
    @Post('assign-templates/:serverId')
    @ApiOperation({
        summary: 'Przypisz szablony wojsk do wiosek (Menedżer Konta)',
        description: 'Uruchamia scraper, który na podstawie przypisanego `armyTemplateName` i stanu rekrutacji, automatycznie wyklika przypisanie odpowiednich szablonów ze zdefiniowanej listy.'
    })
    @ApiParam({
        name: 'serverId',
        description: 'ID serwera',
        type: Number,
        example: 1
    })
    @ApiResponse({
        status: 200,
        description: 'Pomyślnie przypisano szablony do wiosek',
        schema: {
            type: 'object',
            properties: {
                totalExecutionTimeMs: { type: 'number', description: 'Całkowity czas rzutujący na całą operację (pobranie danych + przypisanie szablonów) w ms' },
                scrapedVillagesCount: { type: 'number', description: 'Całkowita liczba zescrapowanych wiosek' },
                assignedGroups: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            templateName: { type: 'string', description: 'Nazwa szablonu' },
                            villageIds: { type: 'array', items: { type: 'number' }, description: 'Lista ID wiosek do których szablon został przypisany' },
                            success: { type: 'boolean', description: 'Czy przypisanie grupy przebiegło bez błędu' }
                        }
                    }
                }
            }
        }
    })
    @ApiResponse({ status: 500, description: 'Internal server error during template assignment' })
    public async assignTroopTemplates(@Param('serverId') serverId: number) {
        try {
            this.logger.log(`Manual trigger requested for troop template assignment on server ID: ${serverId}`);
            const t0 = performance.now();

            if (!serverId || isNaN(Number(serverId))) {
                throw new BadRequestException('Invalid serverId parameter');
            }

            // First, get combined data to determine the villages we want to work with
            const scrapeResult = await this.crawlerService.getAccountManagerCombinedData(Number(serverId));

            const villages = scrapeResult.villages;

            // Next, pass those villages into the assignment operation
            const assignResult = await this.crawlerService.assignAccountManagerTroopTemplates(Number(serverId), villages);

            const totalExecutionTimeMs = Math.round(performance.now() - t0);

            this.logger.log(`Successfully completed template assignment. Passed ${villages.length} villages over ${totalExecutionTimeMs}ms.`);

            return {
                totalExecutionTimeMs,
                scrapedVillagesCount: villages.length,
                assignedGroups: assignResult.assignedGroups
            };

        } catch (error) {
            this.logger.error(`Error during troop template assignment trigger: ${error.message}`, error.stack);
            throw new InternalServerErrorException(`Failed to assign troop templates: ${error.message}`);
        }
    }
}
