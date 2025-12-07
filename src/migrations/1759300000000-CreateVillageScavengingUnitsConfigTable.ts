import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateVillageScavengingUnitsConfigTable1759300000000 implements MigrationInterface {
    name = 'CreateVillageScavengingUnitsConfigTable1759300000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create new table for village scavenging units configuration
        await queryRunner.query(`
            CREATE TABLE \`village_scavenging_units_config\` (
                \`villageId\` varchar(255) NOT NULL,
                \`serverId\` int NOT NULL,
                \`isScavengingSpearEnabled\` tinyint NOT NULL DEFAULT 1,
                \`isScavengingSwordEnabled\` tinyint NOT NULL DEFAULT 0,
                \`isScavengingAxeEnabled\` tinyint NOT NULL DEFAULT 0,
                \`isScavengingArcherEnabled\` tinyint NOT NULL DEFAULT 0,
                \`isScavengingLightEnabled\` tinyint NOT NULL DEFAULT 0,
                \`isScavengingMarcherEnabled\` tinyint NOT NULL DEFAULT 0,
                \`isScavengingHeavyEnabled\` tinyint NOT NULL DEFAULT 0,
                \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                PRIMARY KEY (\`villageId\`),
                INDEX \`IDX_village_scavenging_units_config_serverId\` (\`serverId\`),
                CONSTRAINT \`FK_village_scavenging_units_config_village\` FOREIGN KEY (\`villageId\`) REFERENCES \`villages\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
            ) ENGINE=InnoDB
        `);

        // Create default config for all villages with isAutoScavengingEnabled = true
        // Since columns don't exist in villages table, we create default values (spear=true, rest=false)
        await queryRunner.query(`
            INSERT INTO \`village_scavenging_units_config\` (
                \`villageId\`,
                \`serverId\`,
                \`isScavengingSpearEnabled\`,
                \`isScavengingSwordEnabled\`,
                \`isScavengingAxeEnabled\`,
                \`isScavengingArcherEnabled\`,
                \`isScavengingLightEnabled\`,
                \`isScavengingMarcherEnabled\`,
                \`isScavengingHeavyEnabled\`
            )
            SELECT 
                \`id\` as \`villageId\`,
                \`serverId\`,
                1 as \`isScavengingSpearEnabled\`,
                0 as \`isScavengingSwordEnabled\`,
                0 as \`isScavengingAxeEnabled\`,
                0 as \`isScavengingArcherEnabled\`,
                0 as \`isScavengingLightEnabled\`,
                0 as \`isScavengingMarcherEnabled\`,
                0 as \`isScavengingHeavyEnabled\`
            FROM \`villages\`
            WHERE \`isAutoScavengingEnabled\` = 1
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop the new table
        await queryRunner.query(`
            DROP TABLE IF EXISTS \`village_scavenging_units_config\`
        `);
    }
}

