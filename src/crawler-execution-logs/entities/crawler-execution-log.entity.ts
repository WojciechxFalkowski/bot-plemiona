import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { ServerEntity } from '@/servers/entities/server.entity';

export enum ExecutionStatus {
    SUCCESS = 'success',
    ERROR = 'error'
}

@Entity('crawler_execution_logs')
@Index(['serverId', 'startedAt'])
@Index(['serverId', 'title'])
@Index(['startedAt'])
export class CrawlerExecutionLogEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'int' })
    @Index()
    serverId: number;

    @Column({ type: 'varchar', length: 255, nullable: true })
    villageId: string | null;

    @Column({ type: 'varchar', length: 255 })
    title: string;

    @Column({ type: 'text', nullable: true })
    description: string | null;

    @Column({ type: 'enum', enum: ExecutionStatus })
    status: ExecutionStatus;

    @Column({ type: 'datetime' })
    startedAt: Date;

    @Column({ type: 'datetime' })
    endedAt: Date;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @ManyToOne(() => ServerEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'serverId' })
    server: ServerEntity;
}

