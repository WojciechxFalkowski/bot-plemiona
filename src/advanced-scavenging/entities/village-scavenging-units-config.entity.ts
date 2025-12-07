import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn, OneToOne, JoinColumn } from 'typeorm';
import { VillageEntity } from '@/villages/entities/village.entity';

@Entity('village_scavenging_units_config')
export class VillageScavengingUnitsConfigEntity {
    @PrimaryColumn({ type: 'varchar' })
    villageId: string;

    @Column({ type: 'int' })
    serverId: number;

    @Column({ default: true })
    isScavengingSpearEnabled: boolean;

    @Column({ default: false })
    isScavengingSwordEnabled: boolean;

    @Column({ default: false })
    isScavengingAxeEnabled: boolean;

    @Column({ default: false })
    isScavengingArcherEnabled: boolean;

    @Column({ default: false })
    isScavengingLightEnabled: boolean;

    @Column({ default: false })
    isScavengingMarcherEnabled: boolean;

    @Column({ default: false })
    isScavengingHeavyEnabled: boolean;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    // Relacja 1:1 z VillageEntity
    @OneToOne(() => VillageEntity)
    @JoinColumn({ name: 'villageId', referencedColumnName: 'id' })
    village: VillageEntity;
}

