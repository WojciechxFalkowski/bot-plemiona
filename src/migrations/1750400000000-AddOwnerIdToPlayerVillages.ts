import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOwnerIdToPlayerVillages1750400000000 implements MigrationInterface {
    name = 'AddOwnerIdToPlayerVillages1750400000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add ownerId column
        await queryRunner.query(`ALTER TABLE player_villages ADD ownerId varchar(255) NOT NULL DEFAULT ''`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove ownerId column
        await queryRunner.query(`ALTER TABLE player_villages DROP COLUMN ownerId`);
    }
}
