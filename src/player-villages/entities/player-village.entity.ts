import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { ServerEntity } from '@/servers/entities/server.entity';

@Entity('player_villages')
@Index(['serverId', 'target'])
@Index(['serverId', 'owner'])
@Index(['serverId'])
export class PlayerVillageEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'varchar', length: 255 })
    target: string;

    @Column({ type: 'int' })
    serverId: number;

    @Column({ type: 'varchar', length: 255 })
    villageId: string;

    @Column({ type: 'varchar', length: 255 })
    name: string;

    @Column({ type: 'int' })
    coordinateX: number; 

    @Column({ type: 'int' })
    coordinateY: number;

    @Column({ type: 'varchar', length: 255 })
    owner: string;

    @Column({ type: 'varchar', length: 255 })
    ownerId: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    tribe?: string;

    @Column({ type: 'int' })
    points: number;

    @Column({ default: true })
    canAttack: boolean;

    @Column({ type: 'timestamp', nullable: true })
    lastVerified: Date;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @ManyToOne(() => ServerEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'serverId' })
    server: ServerEntity;
}
