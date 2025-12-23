import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm'

export class CreateGlobalSettingsTable1761000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'global_settings',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'key',
            type: 'varchar',
            length: '191',
          },
          {
            name: 'value',
            type: 'json',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    )

    await queryRunner.createIndex(
      'global_settings',
      new TableIndex({
        name: 'IDX_global_settings_key',
        columnNames: ['key'],
        isUnique: true,
      }),
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('global_settings', 'IDX_global_settings_key')
    await queryRunner.dropTable('global_settings', true)
  }
}


