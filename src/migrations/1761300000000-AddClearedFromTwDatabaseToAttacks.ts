import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddClearedFromTwDatabaseToAttacks1761300000000 implements MigrationInterface {
    name = 'AddClearedFromTwDatabaseToAttacks1761300000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        const tableExists = await queryRunner.hasTable('tw_database_attacks');
        if (!tableExists) return;

        await queryRunner.query(`
            ALTER TABLE \`tw_database_attacks\`
            ADD COLUMN \`clearedFromTwDatabase\` tinyint(1) NOT NULL DEFAULT 0
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const tableExists = await queryRunner.hasTable('tw_database_attacks');
        if (!tableExists) return;

        await queryRunner.query(`
            ALTER TABLE \`tw_database_attacks\`
            DROP COLUMN \`clearedFromTwDatabase\`
        `);
    }
}
