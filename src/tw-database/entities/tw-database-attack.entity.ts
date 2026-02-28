import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    UpdateDateColumn,
    Index,
    ManyToOne,
    JoinColumn,
    OneToOne
} from 'typeorm';
import { ServerEntity } from '@/servers/entities/server.entity';
import { TwDatabaseAttackDetailsEntity } from './tw-database-attack-details.entity';

export enum TwDatabaseAttackStatus {
    PENDING = 'pending',
    SENT = 'sent',
    FAILED = 'failed',
}

@Entity('tw_database_attacks')
@Index(['fingerprint'], { unique: true })
@Index(['status'])
@Index(['serverId'])
export class TwDatabaseAttackEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'varchar', length: 64, unique: true })
    fingerprint: string;

    @Column({ type: 'int', nullable: true })
    serverId: number | null;

    @ManyToOne(() => ServerEntity, { onDelete: 'SET NULL', nullable: true })
    @JoinColumn({ name: 'serverId' })
    server: ServerEntity | null;

    @OneToOne(() => TwDatabaseAttackDetailsEntity, details => details.attack, { cascade: true })
    details: TwDatabaseAttackDetailsEntity;

    @Column({ type: 'enum', enum: TwDatabaseAttackStatus, default: TwDatabaseAttackStatus.PENDING })
    status: TwDatabaseAttackStatus;

    @Column({ type: 'datetime', nullable: true })
    sentAt: Date | null;

    @Column({ type: 'text', nullable: true })
    failureReason: string | null;

    @Column({ type: 'boolean', default: false })
    clearedFromTwDatabase: boolean;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
