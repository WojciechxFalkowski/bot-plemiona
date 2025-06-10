import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUsersTable1749401100000 implements MigrationInterface {
    name = 'CreateUsersTable1749401100000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
      CREATE TABLE \`users\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`clerkUserId\` varchar(255) NOT NULL,
        \`email\` varchar(255) NOT NULL,
        \`gameNick\` varchar(255) NULL,
        \`gamePassword\` varchar(255) NULL,
        \`gameServer\` varchar(255) NULL,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        UNIQUE INDEX \`IDX_users_clerkUserId\` (\`clerkUserId\`),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX \`IDX_users_clerkUserId\` ON \`users\``);
        await queryRunner.query(`DROP TABLE \`users\``);
    }
}