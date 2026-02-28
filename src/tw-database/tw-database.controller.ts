import { Controller, Get, Logger, Query, BadRequestException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { TwDatabaseService } from './tw-database.service';
import { VisitAttackPlannerDecorators } from './decorators';
import { ServersService } from '@/servers/servers.service';

/**
 * Controller for TWDatabase (twdatabase.online) integration.
 * Attack Planner - scrape, filter, save to DB, send attacks. Integrated with crawler orchestrator.
 */
@ApiTags('TWDatabase')
@Controller('tw-database')
export class TwDatabaseController {
    private readonly logger = new Logger(TwDatabaseController.name);

    constructor(
        private readonly twDatabaseService: TwDatabaseService,
        private readonly serversService: ServersService
    ) {}

    /**
     * GET endpoint - manually triggers visit to TWDatabase Attack Planner.
     * serverId: optional, defaults to first active server. headless: optional, defaults to NODE_ENV=production.
     */
    @Get('visit-attack-planner')
    @VisitAttackPlannerDecorators()
    async visitAttackPlanner(
        @Query('serverId') serverIdStr?: string,
        @Query('headless') headless?: string
    ) {
        let serverId: number;
        if (serverIdStr) {
            serverId = parseInt(serverIdStr, 10);
            if (Number.isNaN(serverId)) {
                throw new BadRequestException('Invalid serverId');
            }
        } else {
            const activeServers = await this.serversService.findActiveServers();
            if (activeServers.length === 0) {
                throw new BadRequestException('No active servers - provide serverId');
            }
            serverId = activeServers[0].id;
        }
        const isHeadless = headless !== undefined ? headless !== 'false' : process.env.NODE_ENV === 'production';
        this.logger.log(`Manual trigger: visit TWDatabase Attack Planner for server ${serverId} (headless=${isHeadless})`);
        return this.twDatabaseService.visitAttackPlanner(serverId, isHeadless);
    }
}
