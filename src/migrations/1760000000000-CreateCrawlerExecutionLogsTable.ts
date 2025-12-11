import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCrawlerExecutionLogsTable1760000000000 implements MigrationInterface {
    name = 'CreateCrawlerExecutionLogsTable1760000000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE \`crawler_execution_logs\` (
                \`id\` int NOT NULL AUTO_INCREMENT,
                \`serverId\` int NOT NULL,
                \`villageId\` varchar(255) NULL,
                \`title\` varchar(255) NOT NULL,
                \`description\` text NULL,
                \`status\` enum('success', 'error') NOT NULL,
                \`startedAt\` datetime NOT NULL,
                \`endedAt\` datetime NOT NULL,
                \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                PRIMARY KEY (\`id\`),
                INDEX \`IDX_crawler_execution_logs_serverId\` (\`serverId\`),
                INDEX \`IDX_crawler_execution_logs_serverId_startedAt\` (\`serverId\`, \`startedAt\`),
                INDEX \`IDX_crawler_execution_logs_serverId_title\` (\`serverId\`, \`title\`),
                INDEX \`IDX_crawler_execution_logs_startedAt\` (\`startedAt\`),
                CONSTRAINT \`FK_crawler_execution_logs_serverId\` 
                    FOREIGN KEY (\`serverId\`) REFERENCES \`servers\`(\`id\`) ON DELETE CASCADE
            ) ENGINE=InnoDB
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`crawler_execution_logs\` DROP FOREIGN KEY \`FK_crawler_execution_logs_serverId\``);
        await queryRunner.query(`DROP INDEX \`IDX_crawler_execution_logs_startedAt\` ON \`crawler_execution_logs\``);
        await queryRunner.query(`DROP INDEX \`IDX_crawler_execution_logs_serverId_title\` ON \`crawler_execution_logs\``);
        await queryRunner.query(`DROP INDEX \`IDX_crawler_execution_logs_serverId_startedAt\` ON \`crawler_execution_logs\``);
        await queryRunner.query(`DROP INDEX \`IDX_crawler_execution_logs_serverId\` ON \`crawler_execution_logs\``);
        await queryRunner.query(`DROP TABLE \`crawler_execution_logs\``);
    }
}

