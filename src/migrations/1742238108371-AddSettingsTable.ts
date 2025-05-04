import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSettingsTable1742238108371 implements MigrationInterface {
    name = 'AddSettingsTable1742238108371'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`settings\` (\`id\` int NOT NULL AUTO_INCREMENT, \`key\` varchar(255) NOT NULL, \`value\` json NOT NULL, \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), UNIQUE INDEX \`IDX_c8639b7626fa94ba8265628f21\` (\`key\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX \`IDX_c8639b7626fa94ba8265628f21\` ON \`settings\``);
        await queryRunner.query(`DROP TABLE \`settings\``);
    }
} 