import { MigrationInterface, QueryRunner } from "typeorm";

export class AddVillagesTable1742248000000 implements MigrationInterface {
    name = 'AddVillagesTable1742248000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`villages\` (
            \`id\` varchar(255) NOT NULL,
            \`name\` varchar(255) NOT NULL,
            \`coordinates\` varchar(255) NOT NULL,
            \`isAutoBuildEnabled\` tinyint NOT NULL DEFAULT 0,
            \`isAutoScavengingEnabled\` tinyint NOT NULL DEFAULT 0,
            \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
            \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
            PRIMARY KEY (\`id\`)
        ) ENGINE=InnoDB`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE \`villages\``);
    }
} 