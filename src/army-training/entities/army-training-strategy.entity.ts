import { Entity, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, PrimaryGeneratedColumn, Index } from 'typeorm';
import { ServerEntity } from '@/servers/entities/server.entity';

@Entity('army_training_strategies')
@Index(['serverId', 'villageId'])
@Index(['serverId'])
export class ArmyTrainingStrategyEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'int' })
    serverId: number;

    @Column({ type: 'varchar', length: 255 })
    villageId: string;

    // Jednostki piechoty
    @Column({ type: 'int', default: 0 })
    spear: number;

    @Column({ type: 'int', default: 0 })
    sword: number;

    @Column({ type: 'int', default: 0 })
    axe: number;

    @Column({ type: 'int', default: 0 })
    archer: number;

    @Column({ type: 'int', default: 0 })
    spy: number;

    // Jednostki kawalerii
    @Column({ type: 'int', default: 0 })
    light: number;

    @Column({ type: 'int', default: 0 })
    marcher: number;

    @Column({ type: 'int', default: 0 })
    heavy: number;

    // Maszyny oblężnicze
    @Column({ type: 'int', default: 0 })
    ram: number;

    @Column({ type: 'int', default: 0 })
    catapult: number;

    // Jednostki specjalne
    @Column({ type: 'int', default: 0 })
    knight: number;

    @Column({ type: 'int', default: 0 })
    snob: number;

    @Column({ type: 'boolean', default: true })
    is_active: boolean;

    // Per-unit limits
    @Column({ type: 'int', nullable: true })
    max_total_per_unit: number | null;

    @Column({ type: 'int', default: 10 })
    max_in_queue_per_unit_overall: number;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    // Relacje
    @ManyToOne(() => ServerEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'serverId' })
    server: ServerEntity;
}
