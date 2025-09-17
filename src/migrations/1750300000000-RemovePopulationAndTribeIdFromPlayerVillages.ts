import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemovePopulationAndTribeIdFromPlayerVillages1750300000000 implements MigrationInterface {
    name = 'RemovePopulationAndTribeIdFromPlayerVillages1750300000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Remove population column
        await queryRunner.query(`ALTER TABLE player_villages DROP COLUMN population`);
        
        // Remove tribeId column
        await queryRunner.query(`ALTER TABLE player_villages DROP COLUMN tribeId`);
        
        // Remove ownerId column
        await queryRunner.query(`ALTER TABLE player_villages DROP COLUMN ownerId`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Add population column back
        await queryRunner.query(`ALTER TABLE player_villages ADD population int NOT NULL DEFAULT 0`);
        
        // Add tribeId column back
        await queryRunner.query(`ALTER TABLE player_villages ADD tribeId varchar(255)`);
        
        // Add ownerId column back
        await queryRunner.query(`ALTER TABLE player_villages ADD ownerId varchar(255)`);
    }
}
