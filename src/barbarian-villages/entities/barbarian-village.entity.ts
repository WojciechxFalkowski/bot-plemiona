import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ServerEntity } from '@/servers/entities/server.entity';

@Entity('barbarian_villages')
export class BarbarianVillageEntity {
    @PrimaryColumn()
    target: string; // Primary key - unique village target ID

    @Column({ type: 'int' })
    serverId: number;

    @Column({ type: 'varchar', length: 255 })
    villageId: string;

    @Column()
    name: string;

    @Column()
    coordinateX: number;

    @Column()
    coordinateY: number;

    @Column({ default: true })
    canAttack: boolean;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @ManyToOne(() => ServerEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'serverId' })
    server: ServerEntity;
} 