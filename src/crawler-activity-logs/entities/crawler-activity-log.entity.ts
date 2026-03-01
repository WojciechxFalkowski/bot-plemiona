import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
    Index
} from 'typeorm';
import { ServerEntity } from '@/servers/entities/server.entity';

export enum CrawlerActivityEventType {
    SESSION_EXPIRED = 'session_expired',
    RECAPTCHA_BLOCKED = 'recaptcha_blocked',
    SUCCESS = 'success',
    ERROR = 'error',
    INFO = 'info',
}

@Entity('crawler_activity_log')
@Index(['executionLogId'])
@Index(['serverId', 'createdAt'])
export class CrawlerActivityLogEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'int', nullable: true })
    executionLogId: number | null;

    @Column({ type: 'int' })
    @Index()
    serverId: number;

    @ManyToOne(() => ServerEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'serverId' })
    server: ServerEntity;

    @Column({ type: 'varchar', length: 100 })
    operationType: string;

    @Column({ type: 'enum', enum: CrawlerActivityEventType })
    eventType: CrawlerActivityEventType;

    @Column({ type: 'text' })
    message: string;

    @Column({ type: 'json', nullable: true })
    metadata: Record<string, unknown> | null;

    @CreateDateColumn()
    createdAt: Date;
}
