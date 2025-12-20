import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateScheduledAttacksTable1760100000000 implements MigrationInterface {
  name = 'CreateScheduledAttacksTable1760100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if table exists and drop it if it does (in case of failed previous migration)
    const tableExists = await queryRunner.hasTable('scheduled_attacks');
    if (tableExists) {
      await queryRunner.query(`DROP TABLE IF EXISTS \`scheduled_attacks\``);
    }

    await queryRunner.query(`
      CREATE TABLE \`scheduled_attacks\` (
        \`id\` int NOT NULL AUTO_INCREMENT,
        \`serverId\` int NOT NULL,
        \`villageId\` varchar(255) NULL,
        \`targetId\` varchar(255) NOT NULL,
        \`sourceCoordinates\` varchar(255) NOT NULL,
        \`targetCoordinates\` varchar(255) NOT NULL,
        \`attackUrl\` varchar(500) NOT NULL,
        \`attackType\` enum('off', 'fake', 'nobleman', 'support') NOT NULL,
        \`sendTimeFrom\` datetime NOT NULL,
        \`sendTimeTo\` datetime NOT NULL,
        \`status\` enum('pending', 'scheduled', 'executing', 'completed', 'failed', 'cancelled') NOT NULL DEFAULT 'pending',
        \`description\` varchar(500) NULL,
        \`metadata\` json NULL,
        \`executedAt\` datetime NULL,
        \`errorMessage\` text NULL,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`)
      ) ENGINE=InnoDB
    `);

    await queryRunner.query(`
      ALTER TABLE \`scheduled_attacks\` 
      ADD CONSTRAINT \`FK_scheduled_attacks_serverId\` 
      FOREIGN KEY (\`serverId\`) REFERENCES \`servers\`(\`id\`) ON DELETE CASCADE
    `);

    // Note: No foreign key constraint for villageId - village may not be synchronized yet
    // villageId is kept as a reference string, but we don't enforce referential integrity

    await queryRunner.query(`CREATE INDEX \`IDX_scheduled_attacks_serverId\` ON \`scheduled_attacks\` (\`serverId\`)`);
    await queryRunner.query(`CREATE INDEX \`IDX_scheduled_attacks_server_status\` ON \`scheduled_attacks\` (\`serverId\`, \`status\`)`);
    await queryRunner.query(`CREATE INDEX \`IDX_scheduled_attacks_time_window\` ON \`scheduled_attacks\` (\`sendTimeFrom\`, \`sendTimeTo\`)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const tableExists = await queryRunner.hasTable('scheduled_attacks');
    if (!tableExists) {
      return;
    }

    // First drop foreign keys (they depend on indexes)
    // MySQL doesn't support IF EXISTS for DROP FOREIGN KEY, so we use try-catch approach
    try {
      await queryRunner.query(`ALTER TABLE \`scheduled_attacks\` DROP FOREIGN KEY \`FK_scheduled_attacks_serverId\``);
    } catch (error) {
      // Foreign key might not exist, ignore
    }

    // Then drop indexes (after foreign keys are removed) - use try-catch since MySQL doesn't support IF EXISTS
    try {
      await queryRunner.query(`DROP INDEX \`IDX_scheduled_attacks_time_window\` ON \`scheduled_attacks\``);
    } catch (error) {
      // Index might not exist, ignore
    }

    try {
      await queryRunner.query(`DROP INDEX \`IDX_scheduled_attacks_server_status\` ON \`scheduled_attacks\``);
    } catch (error) {
      // Index might not exist, ignore
    }

    try {
      await queryRunner.query(`DROP INDEX \`IDX_scheduled_attacks_serverId\` ON \`scheduled_attacks\``);
    } catch (error) {
      // Index might not exist, ignore
    }

    // Finally drop the table
    await queryRunner.query(`DROP TABLE IF EXISTS \`scheduled_attacks\``);
  }
}

