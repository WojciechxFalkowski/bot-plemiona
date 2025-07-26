// settings.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn, ManyToOne, JoinColumn, Unique, Index } from 'typeorm';
import { ServerEntity } from '@/servers/entities/server.entity';

@Entity('settings')
@Unique('UQ_settings_serverId_key', ['serverId', 'key'])
export class SettingsEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'int' })
    @Index()
    serverId: number;

    @Column({ type: 'varchar' })
    key: string;

    @Column({ type: 'json' })
    value: Record<string, any>;

    @UpdateDateColumn()
    updatedAt: Date;

    @ManyToOne(() => ServerEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'serverId' })
    server: ServerEntity;
}
