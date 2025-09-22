import { MigrationInterface, QueryRunner } from "typeorm";

export class AddFcmTokensTable1758538498918 implements MigrationInterface {
    name = 'AddFcmTokensTable1758538498918'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS \`fcm_tokens\``);
        await queryRunner.query(`CREATE TABLE \`fcm_tokens\` (\`id\` int NOT NULL AUTO_INCREMENT, \`token\` varchar(255) NOT NULL, \`userId\` varchar(255) NOT NULL, \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_639c0f1d38d97d778122d4f299\` (\`token\`), INDEX \`IDX_642d4f7ba5c6e019c2d8f5332a\` (\`userId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX \`IDX_642d4f7ba5c6e019c2d8f5332a\` ON \`fcm_tokens\``);
        await queryRunner.query(`DROP INDEX \`IDX_639c0f1d38d97d778122d4f299\` ON \`fcm_tokens\``);
        await queryRunner.query(`DROP TABLE \`fcm_tokens\``);
    }

}
