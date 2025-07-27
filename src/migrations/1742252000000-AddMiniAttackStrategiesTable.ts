import { MigrationInterface, QueryRunner } from "typeorm";

export class AddMiniAttackStrategiesTable1742252000000 implements MigrationInterface {
    name = 'AddMiniAttackStrategiesTable1742252000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE \`mini_attack_strategies\` (
                \`serverId\` int NOT NULL,
                \`villageId\` varchar(255) NOT NULL,
                \`spear\` int NOT NULL DEFAULT 0,
                \`sword\` int NOT NULL DEFAULT 0,
                \`axe\` int NOT NULL DEFAULT 0,
                \`archer\` int NOT NULL DEFAULT 0,
                \`spy\` int NOT NULL DEFAULT 0,
                \`light\` int NOT NULL DEFAULT 0,
                \`marcher\` int NOT NULL DEFAULT 0,
                \`heavy\` int NOT NULL DEFAULT 0,
                \`ram\` int NOT NULL DEFAULT 0,
                \`catapult\` int NOT NULL DEFAULT 0,
                \`knight\` int NOT NULL DEFAULT 0,
                \`snob\` int NOT NULL DEFAULT 0,
                \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                PRIMARY KEY (\`serverId\`, \`villageId\`)
            ) ENGINE=InnoDB
        `);

        // Unique constraint nie jest potrzebny - composite primary key zapewnia unikalność

        // Dodanie foreign key constraint do tabeli servers
        await queryRunner.query(`
            ALTER TABLE \`mini_attack_strategies\` 
            ADD CONSTRAINT \`FK_mini_attack_strategies_serverId\` 
            FOREIGN KEY (\`serverId\`) REFERENCES \`servers\`(\`id\`) ON DELETE CASCADE
        `);

        // Dodanie indeksu dla wydajności (serverId jest już w primary key)
        await queryRunner.query(`CREATE INDEX \`IDX_mini_attack_strategies_villageId\` ON \`mini_attack_strategies\` (\`villageId\`)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Usunięcie indeksu
        await queryRunner.query(`DROP INDEX \`IDX_mini_attack_strategies_villageId\` ON \`mini_attack_strategies\``);

        // Usunięcie foreign key constraint
        await queryRunner.query(`ALTER TABLE \`mini_attack_strategies\` DROP FOREIGN KEY \`FK_mini_attack_strategies_serverId\``);

        // Usunięcie tabeli
        await queryRunner.query(`DROP TABLE \`mini_attack_strategies\``);
    }
} 