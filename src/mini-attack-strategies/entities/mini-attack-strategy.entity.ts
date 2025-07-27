import { Entity, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, PrimaryColumn } from 'typeorm';
import { ServerEntity } from '@/servers/entities/server.entity';

@Entity('mini_attack_strategies')
export class MiniAttackStrategyEntity {
    @PrimaryColumn({ type: 'int' })
    serverId: number;

    @PrimaryColumn({ type: 'varchar', length: 255 })
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

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    // Relacje
    @ManyToOne(() => ServerEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'serverId' })
    server: ServerEntity;
} 