import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPlemionaCookiesTable1742251000000 implements MigrationInterface {
    name = 'AddPlemionaCookiesTable1742251000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE \`plemiona_cookies\` (
                \`id\` int NOT NULL AUTO_INCREMENT,
                \`name\` varchar(255) NOT NULL,
                \`path\` varchar(255) NOT NULL,
                \`value\` text NOT NULL,
                \`domain\` varchar(255) NOT NULL,
                \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                PRIMARY KEY (\`id\`)
            ) ENGINE=InnoDB
        `);

        // Dodanie indeksów dla wydajności
        await queryRunner.query(`CREATE INDEX \`IDX_plemiona_cookies_name\` ON \`plemiona_cookies\` (\`name\`)`);
        await queryRunner.query(`CREATE INDEX \`IDX_plemiona_cookies_domain\` ON \`plemiona_cookies\` (\`domain\`)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX \`IDX_plemiona_cookies_domain\` ON \`plemiona_cookies\``);
        await queryRunner.query(`DROP INDEX \`IDX_plemiona_cookies_name\` ON \`plemiona_cookies\``);
        await queryRunner.query(`DROP TABLE \`plemiona_cookies\``);
    }
} 