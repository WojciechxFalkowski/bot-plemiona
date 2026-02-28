import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

export enum TwDatabaseAttackStatus {
    PENDING = 'pending',
    SENT = 'sent',
    FAILED = 'failed',
}

@Entity('tw_database_attacks')
@Index(['fingerprint'], { unique: true })
@Index(['status'])
export class TwDatabaseAttackEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'varchar', length: 64, unique: true })
    fingerprint: string;

    @Column({ type: 'json' })
    rawData: Record<string, string>;

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
