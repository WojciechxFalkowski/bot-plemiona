import { MigrationInterface, QueryRunner } from 'typeorm';

export class RefactorTwDatabaseAttacksToTwoTables1761400000000 implements MigrationInterface {
    name = 'RefactorTwDatabaseAttacksToTwoTables1761400000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        const tableExists = await queryRunner.hasTable('tw_database_attacks');
        if (!tableExists) return;

        await queryRunner.query(`
            CREATE TABLE \`tw_database_attack_details\` (
                \`attackId\` int NOT NULL,
                \`lp\` varchar(32) NULL,
                \`etykietaAtaku\` text NULL,
                \`dataWyjsciaOd\` varchar(64) NULL,
                \`dataWyjsciaDo\` varchar(64) NULL,
                \`wioskaWysylajaca\` varchar(128) NULL,
                \`wioskaDocelowa\` varchar(128) NULL,
                \`atakowanyGracz\` varchar(64) NULL,
                \`dataDotarcia\` varchar(128) NULL,
                \`czasDoWysylki\` varchar(64) NULL,
                \`akcjaUrl\` varchar(512) NULL,
                \`attackType\` varchar(16) NULL,
                PRIMARY KEY (\`attackId\`),
                CONSTRAINT \`FK_tw_database_attack_details_attack\` FOREIGN KEY (\`attackId\`) REFERENCES \`tw_database_attacks\`(\`id\`) ON DELETE CASCADE
            ) ENGINE=InnoDB
        `);

        await queryRunner.query(`
            ALTER TABLE \`tw_database_attacks\`
            ADD COLUMN \`serverId\` int NULL,
            ADD CONSTRAINT \`FK_tw_database_attacks_server\` FOREIGN KEY (\`serverId\`) REFERENCES \`servers\`(\`id\`) ON DELETE SET NULL
        `);

        await queryRunner.query(`
            INSERT INTO \`tw_database_attack_details\` (
                \`attackId\`, \`lp\`, \`etykietaAtaku\`, \`dataWyjsciaOd\`, \`dataWyjsciaDo\`,
                \`wioskaWysylajaca\`, \`wioskaDocelowa\`, \`atakowanyGracz\`, \`dataDotarcia\`,
                \`czasDoWysylki\`, \`akcjaUrl\`, \`attackType\`
            )
            SELECT
                \`id\`,
                JSON_UNQUOTE(JSON_EXTRACT(\`rawData\`, '$."LP."')),
                JSON_UNQUOTE(JSON_EXTRACT(\`rawData\`, '$."ETYKIETA ATAKU"')),
                JSON_UNQUOTE(JSON_EXTRACT(\`rawData\`, '$."DATA WYJŚCIA OD"')),
                JSON_UNQUOTE(JSON_EXTRACT(\`rawData\`, '$."DATA WYJŚCIA DO"')),
                JSON_UNQUOTE(JSON_EXTRACT(\`rawData\`, '$."WIOSKA WYSYŁAJĄCA"')),
                JSON_UNQUOTE(JSON_EXTRACT(\`rawData\`, '$."WIOSKA DOCELOWA"')),
                JSON_UNQUOTE(JSON_EXTRACT(\`rawData\`, '$."ATAKOWANY GRACZ"')),
                JSON_UNQUOTE(JSON_EXTRACT(\`rawData\`, '$."DATA DOTARCIA"')),
                JSON_UNQUOTE(JSON_EXTRACT(\`rawData\`, '$."CZAS DO WYSYŁKI"')),
                JSON_UNQUOTE(JSON_EXTRACT(\`rawData\`, '$."AKCJA"')),
                COALESCE(
                    JSON_UNQUOTE(JSON_EXTRACT(\`rawData\`, '$."attackType"')),
                    CASE
                        WHEN LOWER(JSON_UNQUOTE(JSON_EXTRACT(\`rawData\`, '$."ETYKIETA ATAKU"'))) LIKE '%fejk%' THEN 'fejk'
                        WHEN LOWER(JSON_UNQUOTE(JSON_EXTRACT(\`rawData\`, '$."ETYKIETA ATAKU"'))) LIKE '%burzak%' THEN 'burzak'
                        ELSE 'fejk'
                    END
                )
            FROM \`tw_database_attacks\`
        `);

        await queryRunner.query(`
            UPDATE \`tw_database_attacks\` a
            INNER JOIN \`tw_database_attack_details\` d ON d.\`attackId\` = a.\`id\`
            INNER JOIN \`servers\` s ON s.\`serverCode\` = SUBSTRING_INDEX(
                SUBSTRING_INDEX(SUBSTRING_INDEX(d.\`akcjaUrl\`, '/', 3), '//', -1),
                '.',
                1
            )
            SET a.\`serverId\` = s.\`id\`
            WHERE d.\`akcjaUrl\` IS NOT NULL AND d.\`akcjaUrl\` != ''
        `);

        await queryRunner.query(`
            ALTER TABLE \`tw_database_attacks\`
            DROP COLUMN \`rawData\`
        `);

        await queryRunner.query(`
            CREATE INDEX \`IDX_tw_database_attacks_serverId\` ON \`tw_database_attacks\` (\`serverId\`)
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const tableExists = await queryRunner.hasTable('tw_database_attacks');
        if (!tableExists) return;

        await queryRunner.query(`DROP INDEX \`IDX_tw_database_attacks_serverId\` ON \`tw_database_attacks\``);

        await queryRunner.query(`
            ALTER TABLE \`tw_database_attacks\`
            ADD COLUMN \`rawData\` json NULL
        `);

        await queryRunner.query(`
            UPDATE \`tw_database_attacks\` a
            INNER JOIN \`tw_database_attack_details\` d ON d.\`attackId\` = a.\`id\`
            SET a.\`rawData\` = JSON_OBJECT(
                'LP.', d.\`lp\`,
                'ETYKIETA ATAKU', d.\`etykietaAtaku\`,
                'DATA WYJŚCIA OD', d.\`dataWyjsciaOd\`,
                'DATA WYJŚCIA DO', d.\`dataWyjsciaDo\`,
                'WIOSKA WYSYŁAJĄCA', d.\`wioskaWysylajaca\`,
                'WIOSKA DOCELOWA', d.\`wioskaDocelowa\`,
                'ATAKOWANY GRACZ', d.\`atakowanyGracz\`,
                'DATA DOTARCIA', d.\`dataDotarcia\`,
                'CZAS DO WYSYŁKI', d.\`czasDoWysylki\`,
                'AKCJA', d.\`akcjaUrl\`,
                'attackType', d.\`attackType\`
            )
        `);

        await queryRunner.query(`
            ALTER TABLE \`tw_database_attacks\`
            DROP FOREIGN KEY \`FK_tw_database_attacks_server\`,
            DROP COLUMN \`serverId\`
        `);

        await queryRunner.query(`DROP TABLE IF EXISTS \`tw_database_attack_details\``);

        await queryRunner.query(`
            ALTER TABLE \`tw_database_attacks\`
            MODIFY COLUMN \`rawData\` json NOT NULL
        `);
    }
}
