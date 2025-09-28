import { MigrationInterface, QueryRunner } from "typeorm";

export class AddIsActiveToMiniAttackStrategies1758700000000 implements MigrationInterface {
    name = 'AddIsActiveToMiniAttackStrategies1758700000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`mini_attack_strategies\` ADD \`is_active\` tinyint NOT NULL DEFAULT 1`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`mini_attack_strategies\` DROP COLUMN \`is_active\``);
    }

}
