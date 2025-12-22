import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { ServerEntity } from '@/servers/entities/server.entity';
import { VillageEntity } from '@/villages/entities/village.entity';

export enum ScheduledAttackType {
  OFF = 'off',
  FAKE = 'fake',
  NOBLEMAN = 'nobleman',
  SUPPORT = 'support',
}

export enum ScheduledAttackStatus {
  PENDING = 'pending',
  SCHEDULED = 'scheduled',
  EXECUTING = 'executing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
}

@Entity('scheduled_attacks')
@Index(['serverId'])
@Index(['serverId', 'status'])
@Index(['sendTimeFrom', 'sendTimeTo'])
export class ScheduledAttackEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  serverId: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  villageId?: string;

  @Column({ type: 'varchar', length: 255 })
  targetId: string;

  @Column({ type: 'varchar', length: 255 })
  sourceCoordinates: string;

  @Column({ type: 'varchar', length: 255 })
  targetCoordinates: string;

  @Column({ type: 'varchar', length: 500 })
  attackUrl: string;

  @Column({ type: 'enum', enum: ScheduledAttackType })
  attackType: ScheduledAttackType;

  @Column({ type: 'datetime' })
  sendTimeFrom: Date;

  @Column({ type: 'datetime' })
  sendTimeTo: Date;

  @Column({ type: 'enum', enum: ScheduledAttackStatus, default: ScheduledAttackStatus.PENDING })
  status: ScheduledAttackStatus;

  @Column({ type: 'varchar', length: 500, nullable: true })
  description?: string;

  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, unknown>;

  @Column({ type: 'datetime', nullable: true })
  executedAt?: Date;

  @Column({ type: 'text', nullable: true })
  errorMessage?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => ServerEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'serverId' })
  server: ServerEntity;

  // Note: No @ManyToOne relation - villageId is just a reference string
  // Village may not be synchronized yet, so we don't enforce foreign key constraint
}

