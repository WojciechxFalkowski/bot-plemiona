import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class AddScavengingLimitsTable1759000000000 implements MigrationInterface {
    name = 'AddScavengingLimitsTable1759000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create scavenging_limits table
        await queryRunner.createTable(
            new Table({
                name: 'scavenging_limits',
                columns: [
                    {
                        name: 'id',
                        type: 'int',
                        isPrimary: true,
                        isGenerated: true,
                        generationStrategy: 'increment',
                    },
                    {
                        name: 'serverId',
                        type: 'int',
                        isNullable: false,
                    },
                    {
                        name: 'villageId',
                        type: 'varchar',
                        length: '255',
                        isNullable: false,
                    },
                    {
                        name: 'maxSpearUnits',
                        type: 'int',
                        default: 0,
                        isNullable: false,
                    },
                    {
                        name: 'createdAt',
                        type: 'timestamp',
                        default: 'CURRENT_TIMESTAMP',
                        isNullable: false,
                    },
                    {
                        name: 'updatedAt',
                        type: 'timestamp',
                        default: 'CURRENT_TIMESTAMP',
                        onUpdate: 'CURRENT_TIMESTAMP',
                        isNullable: false,
                    },
                ],
            }),
            true,
        );

        // Create unique index for serverId + villageId combination
        await queryRunner.createIndex(
            'scavenging_limits',
            new TableIndex({
                name: 'IDX_scavenging_limits_serverId_villageId',
                columnNames: ['serverId', 'villageId'],
                isUnique: true,
            }),
        );

        // Create index for serverId
        await queryRunner.createIndex(
            'scavenging_limits',
            new TableIndex({
                name: 'IDX_scavenging_limits_serverId',
                columnNames: ['serverId'],
            }),
        );

        // Create foreign key constraint
        await queryRunner.createForeignKey(
            'scavenging_limits',
            new TableForeignKey({
                name: 'FK_scavenging_limits_serverId',
                columnNames: ['serverId'],
                referencedTableName: 'servers',
                referencedColumnNames: ['id'],
                onDelete: 'CASCADE',
            }),
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop foreign key
        await queryRunner.dropForeignKey('scavenging_limits', 'FK_scavenging_limits_serverId');

        // Drop indexes
        await queryRunner.dropIndex('scavenging_limits', 'IDX_scavenging_limits_serverId');
        await queryRunner.dropIndex('scavenging_limits', 'IDX_scavenging_limits_serverId_villageId');

        // Drop table
        await queryRunner.dropTable('scavenging_limits');
    }
}
