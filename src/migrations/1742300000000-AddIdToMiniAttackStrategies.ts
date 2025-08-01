import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class AddIdToMiniAttackStrategies1742300000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Tworzymy nową tabelę z id jako kluczem głównym
        await queryRunner.createTable(
            new Table({
                name: 'mini_attack_strategies_new',
                columns: [
                    {
                        name: 'id',
                        type: 'serial',
                        isPrimary: true,
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
                        name: 'spear',
                        type: 'int',
                        default: 0,
                    },
                    {
                        name: 'sword',
                        type: 'int',
                        default: 0,
                    },
                    {
                        name: 'axe',
                        type: 'int',
                        default: 0,
                    },
                    {
                        name: 'archer',
                        type: 'int',
                        default: 0,
                    },
                    {
                        name: 'spy',
                        type: 'int',
                        default: 0,
                    },
                    {
                        name: 'light',
                        type: 'int',
                        default: 0,
                    },
                    {
                        name: 'marcher',
                        type: 'int',
                        default: 0,
                    },
                    {
                        name: 'heavy',
                        type: 'int',
                        default: 0,
                    },
                    {
                        name: 'ram',
                        type: 'int',
                        default: 0,
                    },
                    {
                        name: 'catapult',
                        type: 'int',
                        default: 0,
                    },
                    {
                        name: 'knight',
                        type: 'int',
                        default: 0,
                    },
                    {
                        name: 'snob',
                        type: 'int',
                        default: 0,
                    },
                    {
                        name: 'createdAt',
                        type: 'timestamp',
                        default: 'CURRENT_TIMESTAMP',
                    },
                    {
                        name: 'updatedAt',
                        type: 'timestamp',
                        default: 'CURRENT_TIMESTAMP',
                    },
                ],
            }),
            true,
        );

        // Kopiujemy dane ze starej tabeli do nowej
        await queryRunner.query(`
            INSERT INTO mini_attack_strategies_new 
            (serverId, villageId, spear, sword, axe, archer, spy, light, marcher, heavy, ram, catapult, knight, snob, createdAt, updatedAt)
            SELECT serverId, villageId, spear, sword, axe, archer, spy, light, marcher, heavy, ram, catapult, knight, snob, createdAt, updatedAt
            FROM mini_attack_strategies
        `);

        // Usuwamy starą tabelę
        await queryRunner.dropTable('mini_attack_strategies');

        // Zmieniamy nazwę nowej tabeli na oryginalną
        await queryRunner.renameTable('mini_attack_strategies_new', 'mini_attack_strategies');

        // Dodajemy indeksy dla serverId i villageId
        await queryRunner.createIndex(
            'mini_attack_strategies',
            new TableIndex({
                name: 'IDX_mini_attack_strategies_server_village',
                columnNames: ['serverId', 'villageId'],
            }),
        );

        await queryRunner.createIndex(
            'mini_attack_strategies',
            new TableIndex({
                name: 'IDX_mini_attack_strategies_serverId',
                columnNames: ['serverId'],
            }),
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Tworzymy starą tabelę z serverId i villageId jako kluczami głównymi
        await queryRunner.createTable(
            new Table({
                name: 'mini_attack_strategies_old',
                columns: [
                    {
                        name: 'serverId',
                        type: 'int',
                        isPrimary: true,
                    },
                    {
                        name: 'villageId',
                        type: 'varchar',
                        length: '255',
                        isPrimary: true,
                    },
                    {
                        name: 'spear',
                        type: 'int',
                        default: 0,
                    },
                    {
                        name: 'sword',
                        type: 'int',
                        default: 0,
                    },
                    {
                        name: 'axe',
                        type: 'int',
                        default: 0,
                    },
                    {
                        name: 'archer',
                        type: 'int',
                        default: 0,
                    },
                    {
                        name: 'spy',
                        type: 'int',
                        default: 0,
                    },
                    {
                        name: 'light',
                        type: 'int',
                        default: 0,
                    },
                    {
                        name: 'marcher',
                        type: 'int',
                        default: 0,
                    },
                    {
                        name: 'heavy',
                        type: 'int',
                        default: 0,
                    },
                    {
                        name: 'ram',
                        type: 'int',
                        default: 0,
                    },
                    {
                        name: 'catapult',
                        type: 'int',
                        default: 0,
                    },
                    {
                        name: 'knight',
                        type: 'int',
                        default: 0,
                    },
                    {
                        name: 'snob',
                        type: 'int',
                        default: 0,
                    },
                    {
                        name: 'createdAt',
                        type: 'timestamp',
                        default: 'CURRENT_TIMESTAMP',
                    },
                    {
                        name: 'updatedAt',
                        type: 'timestamp',
                        default: 'CURRENT_TIMESTAMP',
                    },
                ],
            }),
            true,
        );

        // Kopiujemy dane z nowej tabeli do starej (tylko pierwszy rekord dla każdej kombinacji serverId/villageId)
        await queryRunner.query(`
            INSERT INTO mini_attack_strategies_old 
            (serverId, villageId, spear, sword, axe, archer, spy, light, marcher, heavy, ram, catapult, knight, snob, createdAt, updatedAt)
            SELECT DISTINCT ON (serverId, villageId) 
                serverId, villageId, spear, sword, axe, archer, spy, light, marcher, heavy, ram, catapult, knight, snob, createdAt, updatedAt
            FROM mini_attack_strategies
            ORDER BY serverId, villageId, id
        `);

        // Usuwamy nową tabelę
        await queryRunner.dropTable('mini_attack_strategies');

        // Zmieniamy nazwę starej tabeli na oryginalną
        await queryRunner.renameTable('mini_attack_strategies_old', 'mini_attack_strategies');
    }
} 