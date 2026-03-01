import { Injectable, Inject, Logger } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { CrawlerActivityLogEntity, CrawlerActivityEventType } from './entities/crawler-activity-log.entity';
import { CRAWLER_ACTIVITY_LOG_ENTITY_REPOSITORY } from './crawler-activity-logs.service.contracts';

export interface LogActivityDto {
    executionLogId: number | null;
    serverId: number;
    operationType: string;
    eventType: CrawlerActivityEventType;
    message: string;
    metadata?: Record<string, unknown>;
}

@Injectable()
export class CrawlerActivityLogsService {
    private readonly logger = new Logger(CrawlerActivityLogsService.name);

    constructor(
        @Inject(CRAWLER_ACTIVITY_LOG_ENTITY_REPOSITORY)
        private readonly activityLogRepository: Repository<CrawlerActivityLogEntity>,
    ) {}

    /**
     * Logs a single activity event (building built, attack sent, session expired, etc.)
     */
    async logActivity(dto: LogActivityDto): Promise<void> {
        try {
            const log = this.activityLogRepository.create({
                executionLogId: dto.executionLogId,
                serverId: dto.serverId,
                operationType: dto.operationType,
                eventType: dto.eventType,
                message: dto.message,
                metadata: dto.metadata ?? null,
            });
            await this.activityLogRepository.save(log);
        } catch (err) {
            this.logger.error(`Failed to log activity: ${err}`);
        }
    }

    /**
     * Returns activity events for a given execution log, ordered by createdAt ascending
     */
    async findByExecutionLogId(executionLogId: number): Promise<CrawlerActivityLogEntity[]> {
        return this.activityLogRepository.find({
            where: { executionLogId },
            order: { createdAt: 'ASC' },
        });
    }

    /**
     * Deletes activity logs older than 7 days. Runs daily at 2:00 AM.
     */
    @Cron('0 2 * * *')
    async deleteOldLogs(): Promise<void> {
        try {
            const result = await this.activityLogRepository
                .createQueryBuilder()
                .delete()
                .where('createdAt < DATE_SUB(NOW(), INTERVAL 7 DAY)')
                .execute();
            if (result.affected && result.affected > 0) {
                this.logger.log(`Deleted ${result.affected} old activity log(s)`);
            }
        } catch (err) {
            this.logger.error(`Failed to delete old activity logs: ${err}`);
        }
    }
}
