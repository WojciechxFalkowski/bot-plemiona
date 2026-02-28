import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTwDatabaseAttacksTable1761200000000 implements MigrationInterface {
    name = 'CreateTwDatabaseAttacksTable1761200000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        const tableExists = await queryRunner.hasTable('tw_database_attacks');
        if (tableExists) {
            await queryRunner.query(`DROP TABLE IF EXISTS \`tw_database_attacks\``);
        }

        await queryRunner.query(`
            CREATE TABLE \`tw_database_attacks\` (
                \`id\` int NOT NULL AUTO_INCREMENT,
                \`fingerprint\` varchar(64) NOT NULL,
                \`rawData\` json NOT NULL,
                \`status\` enum('pending', 'sent', 'failed') NOT NULL DEFAULT 'pending',
                \`sentAt\` datetime NULL,
                \`failureReason\` text NULL,
                \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                PRIMARY KEY (\`id\`),
                UNIQUE KEY \`UQ_tw_database_attacks_fingerprint\` (\`fingerprint\`),
                KEY \`IDX_tw_database_attacks_status\` (\`status\`)
            ) ENGINE=InnoDB
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const tableExists = await queryRunner.hasTable('tw_database_attacks');
        if (!tableExists) {
            return;
        }
        await queryRunner.query(`DROP TABLE \`tw_database_attacks\``);
    }
}
