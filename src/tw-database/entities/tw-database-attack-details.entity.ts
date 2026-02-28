import { Entity, Column, PrimaryColumn, OneToOne, JoinColumn } from 'typeorm';
import { TwDatabaseAttackEntity } from './tw-database-attack.entity';

@Entity('tw_database_attack_details')
export class TwDatabaseAttackDetailsEntity {
    @PrimaryColumn({ type: 'int' })
    attackId: number;

    @OneToOne(() => TwDatabaseAttackEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'attackId' })
    attack: TwDatabaseAttackEntity;

    @Column({ type: 'varchar', length: 32, nullable: true })
    lp: string | null;

    @Column({ type: 'text', nullable: true })
    etykietaAtaku: string | null;

    @Column({ type: 'varchar', length: 64, nullable: true })
    dataWyjsciaOd: string | null;

    @Column({ type: 'varchar', length: 64, nullable: true })
    dataWyjsciaDo: string | null;

    @Column({ type: 'varchar', length: 128, nullable: true })
    wioskaWysylajaca: string | null;

    @Column({ type: 'varchar', length: 128, nullable: true })
    wioskaDocelowa: string | null;

    @Column({ type: 'varchar', length: 64, nullable: true })
    atakowanyGracz: string | null;

    @Column({ type: 'varchar', length: 128, nullable: true })
    dataDotarcia: string | null;

    @Column({ type: 'varchar', length: 64, nullable: true })
    czasDoWysylki: string | null;

    @Column({ type: 'varchar', length: 512, nullable: true })
    akcjaUrl: string | null;

    @Column({ type: 'varchar', length: 16, nullable: true })
    attackType: string | null;
}
