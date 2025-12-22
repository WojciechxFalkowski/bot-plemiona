import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddExpiredStatusToScheduledAttacks1760300000000 implements MigrationInterface {
  name = 'AddExpiredStatusToScheduledAttacks1760300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const tableExists = await queryRunner.hasTable('scheduled_attacks');
    if (!tableExists) {
      return;
    }

    // Dodaj 'expired' do enum status w tabeli scheduled_attacks
    await queryRunner.query(`
      ALTER TABLE \`scheduled_attacks\` 
      MODIFY COLUMN \`status\` 
      enum('pending', 'scheduled', 'executing', 'completed', 'failed', 'cancelled', 'expired') 
      NOT NULL DEFAULT 'pending'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const tableExists = await queryRunner.hasTable('scheduled_attacks');
    if (!tableExists) {
      return;
    }

    // Konwertuj istniejące rekordy z 'expired' na 'cancelled' przed usunięciem wartości z enum
    await queryRunner.query(`
      UPDATE \`scheduled_attacks\` 
      SET \`status\` = 'cancelled' 
      WHERE \`status\` = 'expired'
    `);

    // Usuń 'expired' z enum
    await queryRunner.query(`
      ALTER TABLE \`scheduled_attacks\` 
      MODIFY COLUMN \`status\` 
      enum('pending', 'scheduled', 'executing', 'completed', 'failed', 'cancelled') 
      NOT NULL DEFAULT 'pending'
    `);
  }
}

