import { MigrationInterface, QueryRunner } from 'typeorm';

export class ExtendScavengingLimitsWithAllUnits1759200000000 implements MigrationInterface {
    name = 'ExtendScavengingLimitsWithAllUnits1759200000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Change maxSpearUnits to nullable (preserve existing values)
        await queryRunner.query(`
            ALTER TABLE \`scavenging_limits\`
            MODIFY COLUMN \`maxSpearUnits\` int NULL DEFAULT NULL
        `);

        // Add new columns for all other unit types
        await queryRunner.query(`
            ALTER TABLE \`scavenging_limits\`
            ADD COLUMN \`maxSwordUnits\` int NULL DEFAULT NULL,
            ADD COLUMN \`maxAxeUnits\` int NULL DEFAULT NULL,
            ADD COLUMN \`maxArcherUnits\` int NULL DEFAULT NULL,
            ADD COLUMN \`maxLightUnits\` int NULL DEFAULT NULL,
            ADD COLUMN \`maxMarcherUnits\` int NULL DEFAULT NULL,
            ADD COLUMN \`maxHeavyUnits\` int NULL DEFAULT NULL
        `);

        // Set null for new columns in existing records (they are already null by default, but explicit is better)
        await queryRunner.query(`
            UPDATE \`scavenging_limits\`
            SET 
                \`maxSwordUnits\` = NULL,
                \`maxAxeUnits\` = NULL,
                \`maxArcherUnits\` = NULL,
                \`maxLightUnits\` = NULL,
                \`maxMarcherUnits\` = NULL,
                \`maxHeavyUnits\` = NULL
            WHERE \`maxSwordUnits\` IS NULL
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove the added columns
        await queryRunner.query(`
            ALTER TABLE \`scavenging_limits\`
            DROP COLUMN \`maxSwordUnits\`,
            DROP COLUMN \`maxAxeUnits\`,
            DROP COLUMN \`maxArcherUnits\`,
            DROP COLUMN \`maxLightUnits\`,
            DROP COLUMN \`maxMarcherUnits\`,
            DROP COLUMN \`maxHeavyUnits\`
        `);

        // Revert maxSpearUnits to NOT NULL with default 0
        // First, set all NULL values to 0
        await queryRunner.query(`
            UPDATE \`scavenging_limits\`
            SET \`maxSpearUnits\` = 0
            WHERE \`maxSpearUnits\` IS NULL
        `);

        // Then change column back to NOT NULL
        await queryRunner.query(`
            ALTER TABLE \`scavenging_limits\`
            MODIFY COLUMN \`maxSpearUnits\` int NOT NULL DEFAULT 0
        `);
    }
}

