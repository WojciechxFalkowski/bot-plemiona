import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ServerEntity } from '@/servers/entities/server.entity';

@Entity('villages')
export class VillageEntity {
    @PrimaryColumn({ type: 'varchar' })
    id: string; // Game ID, not auto-generated

    @Column({ type: 'int' })
    serverId: number;

    @Column()
    name: string;

    @Column()
    coordinates: string; // Format: "XXX|XXX"

    @Column({ default: false })
    isAutoBuildEnabled: boolean;

    @Column({ default: false })
    isAutoScavengingEnabled: boolean;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
} 