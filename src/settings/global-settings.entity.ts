import { Column, Entity, PrimaryGeneratedColumn, UpdateDateColumn, Unique } from 'typeorm'
import { SettingsKey } from './settings-keys.enum'

@Entity('global_settings')
@Unique('UQ_global_settings_key', ['key'])
export class GlobalSettingsEntity {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ type: 'varchar' })
  key: SettingsKey

  @Column({ type: 'json' })
  value: Record<string, any>

  @UpdateDateColumn()
  updatedAt: Date
}


