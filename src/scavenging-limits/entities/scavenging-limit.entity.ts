import { Entity, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, PrimaryGeneratedColumn, Index } from 'typeorm';
import { ServerEntity } from '@/servers/entities/server.entity';

@Entity('scavenging_limits')
@Index(['serverId', 'villageId'])
@Index(['serverId'])
export class ScavengingLimitEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'int' })
    serverId: number;

    @Column({ type: 'varchar', length: 255 })
    villageId: string;

    @Column({ type: 'int', nullable: true, default: null })
    maxSpearUnits: number | null; // Maksymalna ilość pikinierów do użycia w zbieractwie

    @Column({ type: 'int', nullable: true, default: null })
    maxSwordUnits: number | null; // Maksymalna ilość mieczników do użycia w zbieractwie

    @Column({ type: 'int', nullable: true, default: null })
    maxAxeUnits: number | null; // Maksymalna ilość toporników do użycia w zbieractwie

    @Column({ type: 'int', nullable: true, default: null })
    maxArcherUnits: number | null; // Maksymalna ilość łuczników do użycia w zbieractwie

    @Column({ type: 'int', nullable: true, default: null })
    maxLightUnits: number | null; // Maksymalna ilość lekkiej kawalerii do użycia w zbieractwie

    @Column({ type: 'int', nullable: true, default: null })
    maxMarcherUnits: number | null; // Maksymalna ilość konnych łuczników do użycia w zbieractwie

    @Column({ type: 'int', nullable: true, default: null })
    maxHeavyUnits: number | null; // Maksymalna ilość ciężkiej kawalerii do użycia w zbieractwie

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    // Relacje
    @ManyToOne(() => ServerEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'serverId' })
    server: ServerEntity;
}
