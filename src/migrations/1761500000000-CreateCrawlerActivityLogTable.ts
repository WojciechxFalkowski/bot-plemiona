import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCrawlerActivityLogTable1761500000000 implements MigrationInterface {
    name = 'CreateCrawlerActivityLogTable1761500000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE \`crawler_activity_log\` (
                \`id\` int NOT NULL AUTO_INCREMENT,
                \`executionLogId\` int NULL,
                \`serverId\` int NOT NULL,
                \`operationType\` varchar(100) NOT NULL,
                \`eventType\` enum('session_expired', 'success', 'error', 'info') NOT NULL,
                \`message\` text NOT NULL,
                \`metadata\` json NULL,
                \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                PRIMARY KEY (\`id\`),
                INDEX \`IDX_crawler_activity_log_executionLogId\` (\`executionLogId\`),
                INDEX \`IDX_crawler_activity_log_serverId_createdAt\` (\`serverId\`, \`createdAt\`),
                CONSTRAINT \`FK_crawler_activity_log_executionLogId\`
                    FOREIGN KEY (\`executionLogId\`) REFERENCES \`crawler_execution_logs\`(\`id\`) ON DELETE SET NULL,
                CONSTRAINT \`FK_crawler_activity_log_serverId\`
                    FOREIGN KEY (\`serverId\`) REFERENCES \`servers\`(\`id\`) ON DELETE CASCADE
            ) ENGINE=InnoDB
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`crawler_activity_log\` DROP FOREIGN KEY \`FK_crawler_activity_log_serverId\``);
        await queryRunner.query(`ALTER TABLE \`crawler_activity_log\` DROP FOREIGN KEY \`FK_crawler_activity_log_executionLogId\``);
        await queryRunner.query(`DROP INDEX \`IDX_crawler_activity_log_serverId_createdAt\` ON \`crawler_activity_log\``);
        await queryRunner.query(`DROP INDEX \`IDX_crawler_activity_log_executionLogId\` ON \`crawler_activity_log\``);
        await queryRunner.query(`DROP TABLE \`crawler_activity_log\``);
    }
}
