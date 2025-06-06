import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('villages')
export class VillageEntity {
    @PrimaryColumn()
    id: number; // Game ID, not auto-generated

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