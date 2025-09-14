import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPlayerVillagesTable1750200000000 implements MigrationInterface {
    name = 'AddPlayerVillagesTable1750200000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE \`player_villages\` (
                \`id\` int NOT NULL AUTO_INCREMENT,
                \`target\` varchar(255) NOT NULL,
                \`serverId\` int NOT NULL,
                \`villageId\` varchar(255) NOT NULL,
                \`name\` varchar(255) NOT NULL,
                \`coordinateX\` int NOT NULL,
                \`coordinateY\` int NOT NULL,
                \`owner\` varchar(255) NOT NULL,
                \`ownerId\` varchar(255) NULL,
                \`tribe\` varchar(255) NULL,
                \`tribeId\` varchar(255) NULL,
                \`points\` int NOT NULL,
                \`population\` int NOT NULL,
                \`canAttack\` tinyint NOT NULL DEFAULT 1,
                \`lastVerified\` datetime NULL,
                \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                PRIMARY KEY (\`id\`)
            ) ENGINE=InnoDB
        `);

        // Dodanie foreign key constraint do tabeli servers
        await queryRunner.query(`
            ALTER TABLE \`player_villages\` 
            ADD CONSTRAINT \`FK_player_villages_serverId\` 
            FOREIGN KEY (\`serverId\`) REFERENCES \`servers\`(\`id\`) ON DELETE CASCADE
        `);

        // Dodanie indeksów dla wydajności
        await queryRunner.query(`CREATE INDEX \`IDX_player_villages_server_target\` ON \`player_villages\` (\`serverId\`, \`target\`)`);
        await queryRunner.query(`CREATE INDEX \`IDX_player_villages_server_owner\` ON \`player_villages\` (\`serverId\`, \`owner\`)`);
        await queryRunner.query(`CREATE INDEX \`IDX_player_villages_server\` ON \`player_villages\` (\`serverId\`)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Usunięcie indeksów
        await queryRunner.query(`DROP INDEX \`IDX_player_villages_server\` ON \`player_villages\``);
        await queryRunner.query(`DROP INDEX \`IDX_player_villages_server_owner\` ON \`player_villages\``);
        await queryRunner.query(`DROP INDEX \`IDX_player_villages_server_target\` ON \`player_villages\``);

        // Usunięcie foreign key constraint
        await queryRunner.query(`ALTER TABLE \`player_villages\` DROP FOREIGN KEY \`FK_player_villages_serverId\``);

        // Usunięcie tabeli
        await queryRunner.query(`DROP TABLE \`player_villages\``);
    }
}
