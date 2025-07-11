import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCanAttackToBarbarianVillages1749460000000 implements MigrationInterface {
  name = 'AddCanAttackToBarbarianVillages1749460000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`barbarian_villages\` ADD \`canAttack\` tinyint NOT NULL DEFAULT 1`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`barbarian_villages\` DROP COLUMN \`canAttack\``,
    );
  }
} 