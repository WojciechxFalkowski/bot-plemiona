import { MigrationInterface, QueryRunner } from "typeorm";

export class AddVillageIdToBarbarianVillages1750100000000 implements MigrationInterface {
    name = 'AddVillageIdToBarbarianVillages1750100000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`barbarian_villages\` ADD \`villageId\` varchar(255) NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`barbarian_villages\` DROP COLUMN \`villageId\``);
    }
} 