import { Controller, Get, Logger, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { TwDatabaseService } from './tw-database.service';
import { VisitAttackPlannerDecorators } from './decorators';

/**
 * Controller for TWDatabase (twdatabase.online) integration.
 * Quick example endpoint - will be integrated into crawler orchestrator (e.g. every 30 min).
 */
@ApiTags('TWDatabase')
@Controller('tw-database')
export class TwDatabaseController {
    private readonly logger = new Logger(TwDatabaseController.name);

    constructor(private readonly twDatabaseService: TwDatabaseService) {}

    /**
     * GET endpoint - manually triggers visit to TWDatabase Attack Planner.
     * Uses Playwright to open the page. For testing/integration before crawler.
     */
    @Get('visit-attack-planner')
    @VisitAttackPlannerDecorators()
    async visitAttackPlanner(@Query('headless') headless?: string) {
        const isHeadless = headless !== 'false';
        this.logger.log(`Manual trigger: visit TWDatabase Attack Planner (headless=${isHeadless})`);
        return this.twDatabaseService.visitAttackPlanner(isHeadless);
    }
}
