import { Injectable, Inject, Logger } from '@nestjs/common';
import { Repository } from 'typeorm';
import { CrawlerExecutionLogEntity, ExecutionStatus } from './entities/crawler-execution-log.entity';
import { CRAWLER_EXECUTION_LOGS_ENTITY_REPOSITORY } from './crawler-execution-logs.service.contracts';
import { CrawlerExecutionLogResponseDto, ExecutionLogsPaginatedResponseDto } from './dto/crawler-execution-log-response.dto';

export interface CreateExecutionLogDto {
    serverId: number;
    villageId?: string | null;
    title: string;
    description?: string | null;
    startedAt: Date;
}

export interface UpdateExecutionLogDto {
    endedAt: Date;
    status: ExecutionStatus;
    description?: string | null;
}

@Injectable()
export class CrawlerExecutionLogsService {
    private readonly logger = new Logger(CrawlerExecutionLogsService.name);

    constructor(
        @Inject(CRAWLER_EXECUTION_LOGS_ENTITY_REPOSITORY)
        private readonly executionLogRepository: Repository<CrawlerExecutionLogEntity>,
    ) {}

    async logExecution(createDto: CreateExecutionLogDto): Promise<CrawlerExecutionLogEntity> {
        const log = this.executionLogRepository.create({
            serverId: createDto.serverId,
            villageId: createDto.villageId || null,
            title: createDto.title,
            description: createDto.description || null,
            status: ExecutionStatus.SUCCESS,
            startedAt: createDto.startedAt,
            endedAt: createDto.startedAt,
        });

        const savedLog = await this.executionLogRepository.save(log);
        this.logger.debug(`Created execution log with id ${savedLog.id} for ${createDto.title} on server ${createDto.serverId}`);
        return savedLog;
    }

    async updateExecutionLog(logId: number, updateDto: UpdateExecutionLogDto): Promise<CrawlerExecutionLogEntity> {
        await this.executionLogRepository.update(logId, {
            endedAt: updateDto.endedAt,
            status: updateDto.status,
            description: updateDto.description || undefined,
        });

        const updatedLog = await this.executionLogRepository.findOne({ where: { id: logId } });
        if (!updatedLog) {
            throw new Error(`Execution log with id ${logId} not found`);
        }

        this.logger.debug(`Updated execution log with id ${logId} - status: ${updateDto.status}`);
        return updatedLog;
    }

    async findAll(
        serverId?: number,
        status?: ExecutionStatus,
        title?: string,
        startDate?: Date,
        endDate?: Date,
        page: number = 1,
        limit: number = 50
    ): Promise<ExecutionLogsPaginatedResponseDto> {
        const queryBuilder = this.executionLogRepository.createQueryBuilder('log');

        if (serverId !== undefined) {
            queryBuilder.andWhere('log.serverId = :serverId', { serverId });
        }

        if (status !== undefined) {
            queryBuilder.andWhere('log.status = :status', { status });
        }

        if (title !== undefined && title !== null && title !== '') {
            queryBuilder.andWhere('log.title = :title', { title });
        }

        if (startDate !== undefined) {
            queryBuilder.andWhere('log.startedAt >= :startDate', { startDate });
        }

        if (endDate !== undefined) {
            queryBuilder.andWhere('log.startedAt <= :endDate', { endDate });
        }

        const skip = (page - 1) * limit;
        queryBuilder
            .orderBy('log.startedAt', 'DESC')
            .skip(skip)
            .take(limit);

        const [logs, total] = await queryBuilder.getManyAndCount();

        const logsWithDuration: CrawlerExecutionLogResponseDto[] = logs.map(log => ({
            id: log.id,
            serverId: log.serverId,
            villageId: log.villageId,
            title: log.title,
            description: log.description,
            status: log.status,
            startedAt: log.startedAt,
            endedAt: log.endedAt,
            createdAt: log.createdAt,
            updatedAt: log.updatedAt,
            duration: log.endedAt.getTime() - log.startedAt.getTime(),
        }));

        return {
            logs: logsWithDuration,
            total,
            page,
            limit,
        };
    }
}

