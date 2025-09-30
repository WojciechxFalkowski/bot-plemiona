import { MigrationInterface, QueryRunner } from "typeorm";

export class AddGlobalLimitsToArmyTrainingStrategies1758900000000 implements MigrationInterface {
    name = 'AddGlobalLimitsToArmyTrainingStrategies1758900000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE \`army_training_strategies\`
            ADD COLUMN \`max_total_overall\` int NULL AFTER \`is_active\`,
            ADD COLUMN \`max_in_queue_per_unit_overall\` int NOT NULL DEFAULT 10 AFTER \`max_total_overall\`
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE \`army_training_strategies\`
            DROP COLUMN \`max_in_queue_per_unit_overall\`,
            DROP COLUMN \`max_total_overall\`
        `);
    }
}


