// settings.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn } from 'typeorm';

@Entity('settings')
export class SettingsEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'varchar', unique: true })
    key: string;

    @Column({ type: 'json' })
    value: Record<string, any>;

    @UpdateDateColumn()
    updatedAt: Date;
}
