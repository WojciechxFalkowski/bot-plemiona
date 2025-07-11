import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('barbarian_villages')
export class BarbarianVillageEntity {
    @PrimaryColumn()
    target: string; // Primary key - unique village target ID

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
} 