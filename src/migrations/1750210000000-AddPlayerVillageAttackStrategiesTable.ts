import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPlayerVillageAttackStrategiesTable1750210000000 implements MigrationInterface {
    name = 'AddPlayerVillageAttackStrategiesTable1750210000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE \`player_village_attack_strategies\` (
                \`id\` int NOT NULL AUTO_INCREMENT,
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
                PRIMARY KEY (\`id\`)
            ) ENGINE=InnoDB
        `);

        // Dodanie foreign key constraint do tabeli servers
        await queryRunner.query(`
            ALTER TABLE \`player_village_attack_strategies\` 
            ADD CONSTRAINT \`FK_player_village_attack_strategies_serverId\` 
            FOREIGN KEY (\`serverId\`) REFERENCES \`servers\`(\`id\`) ON DELETE CASCADE
        `);

        // Dodanie indeksów dla wydajności
        await queryRunner.query(`CREATE INDEX \`IDX_player_village_attack_strategies_server_village\` ON \`player_village_attack_strategies\` (\`serverId\`, \`villageId\`)`);
        await queryRunner.query(`CREATE INDEX \`IDX_player_village_attack_strategies_server\` ON \`player_village_attack_strategies\` (\`serverId\`)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Usunięcie indeksów
        await queryRunner.query(`DROP INDEX \`IDX_player_village_attack_strategies_server\` ON \`player_village_attack_strategies\``);
        await queryRunner.query(`DROP INDEX \`IDX_player_village_attack_strategies_server_village\` ON \`player_village_attack_strategies\``);

        // Usunięcie foreign key constraint
        await queryRunner.query(`ALTER TABLE \`player_village_attack_strategies\` DROP FOREIGN KEY \`FK_player_village_attack_strategies_serverId\``);

        // Usunięcie tabeli
        await queryRunner.query(`DROP TABLE \`player_village_attack_strategies\``);
    }
}
