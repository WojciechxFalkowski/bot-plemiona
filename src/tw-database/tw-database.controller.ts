import { Controller, Get, Logger, Query, BadRequestException, ParseIntPipe } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { TwDatabaseService } from './tw-database.service';
import { VisitAttackPlannerDecorators, GetAttacksDecorators, GetAttacksSummaryDecorators } from './decorators';
import { ServersService } from '@/servers/servers.service';
import { TwDatabaseAttackStatus } from './entities/tw-database-attack.entity';

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

    /**
     * GET endpoint - returns attacks for a server with optional status filter.
     */
    @Get('attacks')
    @GetAttacksDecorators()
    async getAttacks(
        @Query('serverId', ParseIntPipe) serverId: number,
        @Query('status') statusStr?: string
    ) {
        let status: TwDatabaseAttackStatus | undefined;
        if (statusStr && ['pending', 'sent', 'failed'].includes(statusStr)) {
            status = statusStr as TwDatabaseAttackStatus;
        }
        const attacks = await this.twDatabaseService.getAttacks(serverId, status);
        return { success: true, data: attacks };
    }

    /**
     * GET endpoint - returns attack counts per status for sidebar indicator.
     */
    @Get('attacks/summary')
    @GetAttacksSummaryDecorators()
    async getAttacksSummary(@Query('serverId', ParseIntPipe) serverId: number) {
        const summary = await this.twDatabaseService.getAttacksSummary(serverId);
        return { success: true, data: summary };
    }
}
