import { Entity, Column, CreateDateColumn, UpdateDateColumn, OneToOne, PrimaryColumn } from 'typeorm';
import { ServerCookiesEntity } from './server-cookies.entity';

@Entity('servers')
export class ServerEntity {
    @PrimaryColumn({ type: 'int' })
    id: number;

    @Column({ type: 'varchar', length: 10, unique: true })
    serverCode: string;

    @Column({ type: 'varchar', length: 100 })
    serverName: string;

    @Column({ type: 'tinyint', default: true })
    isActive: boolean;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @OneToOne(() => ServerCookiesEntity, cookies => cookies.server, { cascade: true })
    cookies: ServerCookiesEntity;

    // Relations will be added later when updating other entities
    // @OneToMany(() => VillageEntity, village => village.server)
    // villages: VillageEntity[];

    // @OneToMany(() => BarbarianVillageEntity, barbarianVillage => barbarianVillage.server)
    // barbarianVillages: BarbarianVillageEntity[];

    // @OneToMany(() => VillageConstructionQueueEntity, queue => queue.server)
    // constructionQueue: VillageConstructionQueueEntity[];

    // @OneToMany(() => SettingsEntity, setting => setting.server)
    // settings: SettingsEntity[];
} 