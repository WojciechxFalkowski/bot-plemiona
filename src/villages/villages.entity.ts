import { Entity, Column, CreateDateColumn, UpdateDateColumn, PrimaryColumn } from 'typeorm';

@Entity('villages')
export class VillageEntity {
    @PrimaryColumn({ type: 'varchar' })
    id: string; // ID wioski z gry (nie autogenerowane)

    @Column({ type: 'varchar' })
    name: string;

    @Column({ type: 'varchar' })
    coordinates: string; // Format "XXX|XXX"

    @Column({ type: 'boolean', default: false })
    isAutoBuildEnabled: boolean; // Czy włączone automatyczne budowanie

    @Column({ type: 'boolean', default: false })
    isAutoScavengingEnabled: boolean; // Czy włączone automatyczne zbieractwo

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
} 