import { MigrationInterface, QueryRunner } from "typeorm";

export class FixSettingsTableUniqueIndex1742250108371 implements MigrationInterface {
    name = 'FixSettingsTableUniqueIndex1742250108371'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Usuń stary unique index na key (powoduje konflikt z composite unique index)
        await queryRunner.query(`DROP INDEX \`IDX_c8639b7626fa94ba8265628f21\` ON \`settings\``);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Przywróć stary unique index na key (tylko dla rollback)
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_c8639b7626fa94ba8265628f21\` ON \`settings\` (\`key\`)`);
    }
} 