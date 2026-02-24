import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateServerScavengingLimitsTable1759400000000 implements MigrationInterface {
    name = 'CreateServerScavengingLimitsTable1759400000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
            new Table({
                name: 'server_scavenging_limits',
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
                        name: 'maxSpearUnits',
                        type: 'int',
                        isNullable: true,
                        default: null,
                    },
                    {
                        name: 'maxSwordUnits',
                        type: 'int',
                        isNullable: true,
                        default: null,
                    },
                    {
                        name: 'maxAxeUnits',
                        type: 'int',
                        isNullable: true,
                        default: null,
                    },
                    {
                        name: 'maxArcherUnits',
                        type: 'int',
                        isNullable: true,
                        default: null,
                    },
                    {
                        name: 'maxLightUnits',
                        type: 'int',
                        isNullable: true,
                        default: null,
                    },
                    {
                        name: 'maxMarcherUnits',
                        type: 'int',
                        isNullable: true,
                        default: null,
                    },
                    {
                        name: 'maxHeavyUnits',
                        type: 'int',
                        isNullable: true,
                        default: null,
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

        await queryRunner.createIndex(
            'server_scavenging_limits',
            new TableIndex({
                name: 'IDX_server_scavenging_limits_serverId',
                columnNames: ['serverId'],
                isUnique: true,
            }),
        );

        await queryRunner.createForeignKey(
            'server_scavenging_limits',
            new TableForeignKey({
                name: 'FK_server_scavenging_limits_serverId',
                columnNames: ['serverId'],
                referencedTableName: 'servers',
                referencedColumnNames: ['id'],
                onDelete: 'CASCADE',
            }),
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropForeignKey('server_scavenging_limits', 'FK_server_scavenging_limits_serverId');
        await queryRunner.dropIndex('server_scavenging_limits', 'IDX_server_scavenging_limits_serverId');
        await queryRunner.dropTable('server_scavenging_limits');
    }
}
