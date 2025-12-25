import { MigrationInterface, QueryRunner } from "typeorm";

export class RenameMaxTotalOverallToMaxTotalPerUnit1761100000000 implements MigrationInterface {
    name = 'RenameMaxTotalOverallToMaxTotalPerUnit1761100000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE \`army_training_strategies\`
            CHANGE COLUMN \`max_total_overall\` \`max_total_per_unit\` int NULL
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE \`army_training_strategies\`
            CHANGE COLUMN \`max_total_per_unit\` \`max_total_overall\` int NULL
        `);
    }
}


