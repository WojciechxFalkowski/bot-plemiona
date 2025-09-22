import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

@Entity('fcm_tokens')
export class FcmTokenEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Index({ unique: true })
    @Column({ type: 'varchar', length: 255 })
    token: string;

    @Index()
    @Column({ type: 'varchar', length: 255 })
    userId: string;

    @CreateDateColumn()
    createdAt: Date;
}

