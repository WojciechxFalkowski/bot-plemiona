import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMultiServerSupport1750000000000 implements MigrationInterface {
    name = 'AddMultiServerSupport1750000000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. Utworzenie tabeli servers
        await queryRunner.query(`
            CREATE TABLE \`servers\` (
                \`id\` int NOT NULL AUTO_INCREMENT,
                \`serverCode\` varchar(10) NOT NULL,
                \`serverName\` varchar(100) NOT NULL,
                \`isActive\` tinyint NOT NULL DEFAULT 1,
                \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                UNIQUE INDEX \`IDX_servers_serverCode\` (\`serverCode\`),
                PRIMARY KEY (\`id\`)
            ) ENGINE=InnoDB
        `);

        // 2. Utworzenie tabeli server_cookies
        await queryRunner.query(`
            CREATE TABLE \`server_cookies\` (
                \`id\` int NOT NULL AUTO_INCREMENT,
                \`serverId\` int NOT NULL,
                \`cookiesData\` text NULL,
                \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                UNIQUE INDEX \`IDX_server_cookies_serverId\` (\`serverId\`),
                PRIMARY KEY (\`id\`)
            ) ENGINE=InnoDB
        `);

        // 3. Dodanie server_id do istniejących tabel
        await queryRunner.query(`ALTER TABLE \`villages\` ADD \`serverId\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`barbarian_villages\` ADD \`serverId\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`village_construction_queue\` ADD \`serverId\` int NULL`);
        await queryRunner.query(`ALTER TABLE \`settings\` ADD \`serverId\` int NULL`);

        // 4. Dodanie foreign keys
        await queryRunner.query(`
            ALTER TABLE \`server_cookies\` 
            ADD CONSTRAINT \`FK_server_cookies_serverId\` 
            FOREIGN KEY (\`serverId\`) REFERENCES \`servers\`(\`id\`) ON DELETE CASCADE
        `);

        await queryRunner.query(`
            ALTER TABLE \`villages\` 
            ADD CONSTRAINT \`FK_villages_serverId\` 
            FOREIGN KEY (\`serverId\`) REFERENCES \`servers\`(\`id\`) ON DELETE CASCADE
        `);

        await queryRunner.query(`
            ALTER TABLE \`barbarian_villages\` 
            ADD CONSTRAINT \`FK_barbarian_villages_serverId\` 
            FOREIGN KEY (\`serverId\`) REFERENCES \`servers\`(\`id\`) ON DELETE CASCADE
        `);

        await queryRunner.query(`
            ALTER TABLE \`village_construction_queue\` 
            ADD CONSTRAINT \`FK_village_construction_queue_serverId\` 
            FOREIGN KEY (\`serverId\`) REFERENCES \`servers\`(\`id\`) ON DELETE CASCADE
        `);

        await queryRunner.query(`
            ALTER TABLE \`settings\` 
            ADD CONSTRAINT \`FK_settings_serverId\` 
            FOREIGN KEY (\`serverId\`) REFERENCES \`servers\`(\`id\`) ON DELETE CASCADE
        `);

        // 5. Dodanie unique constraints dla kombinacji server_id + game_id
        await queryRunner.query(`
            ALTER TABLE \`villages\` 
            ADD CONSTRAINT \`UQ_villages_serverId_id\` 
            UNIQUE (\`serverId\`, \`id\`)
        `);

        await queryRunner.query(`
            ALTER TABLE \`barbarian_villages\` 
            ADD CONSTRAINT \`UQ_barbarian_villages_serverId_target\` 
            UNIQUE (\`serverId\`, \`target\`)
        `);

        await queryRunner.query(`
            ALTER TABLE \`settings\` 
            ADD CONSTRAINT \`UQ_settings_serverId_key\` 
            UNIQUE (\`serverId\`, \`key\`)
        `);

        // 6. Dodanie indeksów dla wydajności
        await queryRunner.query(`CREATE INDEX \`IDX_villages_serverId\` ON \`villages\` (\`serverId\`)`);
        await queryRunner.query(`CREATE INDEX \`IDX_barbarian_villages_serverId\` ON \`barbarian_villages\` (\`serverId\`)`);
        await queryRunner.query(`CREATE INDEX \`IDX_village_construction_queue_serverId\` ON \`village_construction_queue\` (\`serverId\`)`);
        await queryRunner.query(`CREATE INDEX \`IDX_settings_serverId_key\` ON \`settings\` (\`serverId\`, \`key\`)`);
        await queryRunner.query(`CREATE INDEX \`IDX_servers_isActive\` ON \`servers\` (\`isActive\`)`);
        
        // Dodatkowe indeksy dla często używanych kolumn
        await queryRunner.query(`CREATE INDEX \`IDX_barbarian_villages_coordinates\` ON \`barbarian_villages\` (\`coordinateX\`, \`coordinateY\`)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Usunięcie indeksów
        await queryRunner.query(`DROP INDEX \`IDX_barbarian_villages_coordinates\` ON \`barbarian_villages\``);
        await queryRunner.query(`DROP INDEX \`IDX_servers_isActive\` ON \`servers\``);
        await queryRunner.query(`DROP INDEX \`IDX_settings_serverId_key\` ON \`settings\``);
        await queryRunner.query(`DROP INDEX \`IDX_village_construction_queue_serverId\` ON \`village_construction_queue\``);
        await queryRunner.query(`DROP INDEX \`IDX_barbarian_villages_serverId\` ON \`barbarian_villages\``);
        await queryRunner.query(`DROP INDEX \`IDX_villages_serverId\` ON \`villages\``);

        // Usunięcie unique constraints
        await queryRunner.query(`ALTER TABLE \`settings\` DROP CONSTRAINT \`UQ_settings_serverId_key\``);
        await queryRunner.query(`ALTER TABLE \`barbarian_villages\` DROP CONSTRAINT \`UQ_barbarian_villages_serverId_target\``);
        await queryRunner.query(`ALTER TABLE \`villages\` DROP CONSTRAINT \`UQ_villages_serverId_id\``);

        // Usunięcie foreign keys
        await queryRunner.query(`ALTER TABLE \`settings\` DROP FOREIGN KEY \`FK_settings_serverId\``);
        await queryRunner.query(`ALTER TABLE \`village_construction_queue\` DROP FOREIGN KEY \`FK_village_construction_queue_serverId\``);
        await queryRunner.query(`ALTER TABLE \`barbarian_villages\` DROP FOREIGN KEY \`FK_barbarian_villages_serverId\``);
        await queryRunner.query(`ALTER TABLE \`villages\` DROP FOREIGN KEY \`FK_villages_serverId\``);
        await queryRunner.query(`ALTER TABLE \`server_cookies\` DROP FOREIGN KEY \`FK_server_cookies_serverId\``);

        // Usunięcie kolumn server_id
        await queryRunner.query(`ALTER TABLE \`settings\` DROP COLUMN \`serverId\``);
        await queryRunner.query(`ALTER TABLE \`village_construction_queue\` DROP COLUMN \`serverId\``);
        await queryRunner.query(`ALTER TABLE \`barbarian_villages\` DROP COLUMN \`serverId\``);
        await queryRunner.query(`ALTER TABLE \`villages\` DROP COLUMN \`serverId\``);

        // Usunięcie tabel
        await queryRunner.query(`DROP INDEX \`IDX_server_cookies_serverId\` ON \`server_cookies\``);
        await queryRunner.query(`DROP TABLE \`server_cookies\``);
        await queryRunner.query(`DROP INDEX \`IDX_servers_serverCode\` ON \`servers\``);
        await queryRunner.query(`DROP TABLE \`servers\``);
    }
} 