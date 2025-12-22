import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUniqueConstraintToScheduledAttacks1760200000000 implements MigrationInterface {
  name = 'AddUniqueConstraintToScheduledAttacks1760200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const tableExists = await queryRunner.hasTable('scheduled_attacks');
    if (!tableExists) {
      return;
    }

    // Check if unique constraint already exists
    const indexExists = await queryRunner.query(`
      SELECT COUNT(*) as count
      FROM INFORMATION_SCHEMA.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'scheduled_attacks'
      AND INDEX_NAME = 'UQ_scheduled_attacks_unique'
    `);

    if (indexExists[0]?.count === '0') {
      // Create unique constraint on combination of fields that define a duplicate
      // Duplicate = same serverId, villageId, targetId, sendTimeFrom, sendTimeTo, attackType
      await queryRunner.query(`
        CREATE UNIQUE INDEX \`UQ_scheduled_attacks_unique\` 
        ON \`scheduled_attacks\` (
          \`serverId\`,
          \`villageId\`,
          \`targetId\`,
          \`sendTimeFrom\`,
          \`sendTimeTo\`,
          \`attackType\`
        )
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const tableExists = await queryRunner.hasTable('scheduled_attacks');
    if (!tableExists) {
      return;
    }

    // Drop unique constraint
    try {
      await queryRunner.query(`DROP INDEX \`UQ_scheduled_attacks_unique\` ON \`scheduled_attacks\``);
    } catch (error) {
      // Index might not exist, ignore
    }
  }
}
