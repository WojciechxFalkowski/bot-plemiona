import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNextTargetIndexToMiniAttackStrategies1758600000000 implements MigrationInterface {
    name = 'AddNextTargetIndexToMiniAttackStrategies1758600000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`mini_attack_strategies\` ADD \`next_target_index\` int NOT NULL DEFAULT 0`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`mini_attack_strategies\` DROP COLUMN \`next_target_index\``);
    }

}
