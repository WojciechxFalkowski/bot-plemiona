import { Entity, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, PrimaryGeneratedColumn, Index } from 'typeorm';
import { ServerEntity } from '@/servers/entities/server.entity';

@Entity('server_scavenging_limits')
@Index(['serverId'], { unique: true })
export class ServerScavengingLimitEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'int', unique: true })
    serverId: number;

    @Column({ type: 'int', nullable: true, default: null })
    maxSpearUnits: number | null;

    @Column({ type: 'int', nullable: true, default: null })
    maxSwordUnits: number | null;

    @Column({ type: 'int', nullable: true, default: null })
    maxAxeUnits: number | null;

    @Column({ type: 'int', nullable: true, default: null })
    maxArcherUnits: number | null;

    @Column({ type: 'int', nullable: true, default: null })
    maxLightUnits: number | null;

    @Column({ type: 'int', nullable: true, default: null })
    maxMarcherUnits: number | null;

    @Column({ type: 'int', nullable: true, default: null })
    maxHeavyUnits: number | null;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @ManyToOne(() => ServerEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'serverId' })
    server: ServerEntity;
}
