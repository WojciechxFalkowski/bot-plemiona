import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm';
import { VillageEntity } from '../../villages/villages.entity';

export enum ConstructionQueueStatus {
    PENDING = 'pending',
    PROCESSING = 'processing'
}

@Entity('village_construction_queue')
@Index(['villageId', 'buildingId', 'targetLevel'], { unique: true })
export class VillageConstructionQueueEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'varchar', length: 255 })
    @Index()
    villageId: string;

    @Column({ type: 'varchar', length: 100 })
    buildingId: string;

    @Column({ type: 'varchar', length: 255 })
    buildingName: string;

    @Column({ type: 'int' })
    targetLevel: number;

    @Column({
        type: 'enum',
        enum: ConstructionQueueStatus,
        default: ConstructionQueueStatus.PENDING
    })
    @Index()
    status: ConstructionQueueStatus;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    // Relacja do Village
    @ManyToOne(() => VillageEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'villageId' })
    village: VillageEntity;
} 