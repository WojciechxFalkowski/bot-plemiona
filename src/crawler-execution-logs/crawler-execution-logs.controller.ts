import { Controller, Get, Query, BadRequestException, Param, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse, ApiParam } from '@nestjs/swagger';
import { CrawlerExecutionLogsService } from './crawler-execution-logs.service';
import { CrawlerActivityLogsService } from '@/crawler-activity-logs/crawler-activity-logs.service';
import { ExecutionStatus } from './entities/crawler-execution-log.entity';
import { ExecutionLogsPaginatedResponseDto } from './dto/crawler-execution-log-response.dto';

@ApiTags('Crawler Execution Logs')
@Controller('crawler-execution-logs')
export class CrawlerExecutionLogsController {
    constructor(
        private readonly crawlerExecutionLogsService: CrawlerExecutionLogsService,
        private readonly crawlerActivityLogsService: CrawlerActivityLogsService,
    ) {}

    @Get()
    @ApiOperation({
        summary: 'Get execution logs with filters and pagination',
        description: 'Retrieves crawler execution logs with optional filtering by server, status, title, date range, and pagination'
    })
    @ApiQuery({
        name: 'serverId',
        required: false,
        type: Number,
        description: 'Filter by server ID'
    })
    @ApiQuery({
        name: 'status',
        required: false,
        enum: ExecutionStatus,
        description: 'Filter by execution status (success or error)'
    })
    @ApiQuery({
        name: 'title',
        required: false,
        type: String,
        description: 'Filter by operation type (e.g., "Construction Queue", "Scavenging", "Mini Attacks", etc.)'
    })
    @ApiQuery({
        name: 'startDate',
        required: false,
        type: String,
        description: 'Start date for date range filter (ISO string)'
    })
    @ApiQuery({
        name: 'endDate',
        required: false,
        type: String,
        description: 'End date for date range filter (ISO string)'
    })
    @ApiQuery({
        name: 'page',
        required: false,
        type: Number,
        description: 'Page number (default: 1)'
    })
    @ApiQuery({
        name: 'limit',
        required: false,
        type: Number,
        description: 'Number of logs per page (default: 50)'
    })
    @ApiQuery({
        name: 'triggeredManually',
        required: false,
        type: Boolean,
        description: 'Filter by trigger source: true = only manual, false = only scheduler, omit = all'
    })
    @ApiResponse({
        status: 200,
        description: 'Execution logs retrieved successfully',
        type: ExecutionLogsPaginatedResponseDto
    })
    async findAll(
        @Query('serverId') serverId?: string,
        @Query('status') status?: string,
        @Query('title') title?: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
        @Query('page') page?: string,
        @Query('limit') limit?: string,
        @Query('triggeredManually') triggeredManually?: string,
    ): Promise<ExecutionLogsPaginatedResponseDto> {
        let parsedServerId: number | undefined = undefined;
        if (serverId !== undefined && serverId !== null && serverId !== '') {
            parsedServerId = parseInt(serverId, 10);
            if (isNaN(parsedServerId)) {
                throw new BadRequestException('serverId must be a valid number');
            }
        }

        let parsedStatus: ExecutionStatus | undefined = undefined;
        if (status !== undefined && status !== null && status !== '') {
            if (status !== ExecutionStatus.SUCCESS && status !== ExecutionStatus.ERROR) {
                throw new BadRequestException('status must be either "success" or "error"');
            }
            parsedStatus = status as ExecutionStatus;
        }

        let parsedTitle: string | undefined = undefined;
        if (title !== undefined && title !== null && title !== '') {
            parsedTitle = title;
        }

        let parsedStartDate: Date | undefined = undefined;
        if (startDate !== undefined && startDate !== null && startDate !== '') {
            parsedStartDate = new Date(startDate);
            if (isNaN(parsedStartDate.getTime())) {
                throw new BadRequestException('startDate must be a valid ISO date string');
            }
        }

        let parsedEndDate: Date | undefined = undefined;
        if (endDate !== undefined && endDate !== null && endDate !== '') {
            parsedEndDate = new Date(endDate);
            if (isNaN(parsedEndDate.getTime())) {
                throw new BadRequestException('endDate must be a valid ISO date string');
            }
        }

        const parsedPage = page ? parseInt(page, 10) : 1;
        if (isNaN(parsedPage) || parsedPage < 1) {
            throw new BadRequestException('page must be a valid positive number');
        }

        const parsedLimit = limit ? parseInt(limit, 10) : 50;
        if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
            throw new BadRequestException('limit must be a valid number between 1 and 100');
        }

        let parsedTriggeredManually: boolean | undefined = undefined;
        if (triggeredManually === 'true') {
            parsedTriggeredManually = true;
        } else if (triggeredManually === 'false') {
            parsedTriggeredManually = false;
        }

        return await this.crawlerExecutionLogsService.findAll(
            parsedServerId,
            parsedStatus,
            parsedTitle,
            parsedStartDate,
            parsedEndDate,
            parsedPage,
            parsedLimit,
            parsedTriggeredManually
        );
    }

    @Get(':id/activities')
    @ApiOperation({
        summary: 'Pobiera zdarzenia aktywności dla logu wykonania',
        description: 'Zwraca listę szczegółowych zdarzeń (np. zbudowane budynki, wysłane ataki) powiązanych z danym uruchomieniem'
    })
    @ApiParam({ name: 'id', description: 'ID logu wykonania' })
    @ApiResponse({ status: 200, description: 'Lista zdarzeń aktywności' })
    async getActivities(@Param('id', ParseIntPipe) id: number) {
        const activities = await this.crawlerActivityLogsService.findByExecutionLogId(id);
        return { success: true, data: activities };
    }
}

