import { ExecutionStatus } from '../entities/crawler-execution-log.entity';

export class CrawlerExecutionLogResponseDto {
    id: number;
    serverId: number;
    villageId: string | null;
    title: string;
    description: string | null;
    status: ExecutionStatus;
    startedAt: Date;
    endedAt: Date;
    createdAt: Date;
    updatedAt: Date;
    duration: number;
}

export class ExecutionLogsPaginatedResponseDto {
    logs: CrawlerExecutionLogResponseDto[];
    total: number;
    page: number;
    limit: number;
}

