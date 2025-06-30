import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddBarbarianVillagesTable1749450000000 implements MigrationInterface {
  name = 'AddBarbarianVillagesTable1749450000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE \`barbarian_villages\` (
        \`target\` varchar(255) NOT NULL,
        \`name\` varchar(255) NOT NULL,
        \`coordinateX\` int NOT NULL,
        \`coordinateY\` int NOT NULL,
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`target\`),
        UNIQUE INDEX \`IDX_barbarian_villages_target\` (\`target\`)
      ) ENGINE=InnoDB`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX \`IDX_barbarian_villages_target\` ON \`barbarian_villages\``,
    );
    await queryRunner.query(`DROP TABLE \`barbarian_villages\``);
  }
} 