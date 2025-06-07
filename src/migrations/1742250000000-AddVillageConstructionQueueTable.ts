import { MigrationInterface, QueryRunner } from "typeorm";

export class AddVillageConstructionQueueTable1742250000000 implements MigrationInterface {
    name = 'AddVillageConstructionQueueTable1742250000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE \`village_construction_queue\` (
                \`id\` int NOT NULL AUTO_INCREMENT,
                \`villageId\` varchar(255) NOT NULL,
                \`buildingId\` varchar(100) NOT NULL,
                \`buildingName\` varchar(255) NOT NULL,
                \`targetLevel\` int NOT NULL,
                \`status\` enum('pending', 'processing') NOT NULL DEFAULT 'pending',
                \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
                \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
                PRIMARY KEY (\`id\`),
                INDEX \`IDX_village_construction_queue_villageId\` (\`villageId\`),
                INDEX \`IDX_village_construction_queue_status\` (\`status\`),
                UNIQUE INDEX \`IDX_village_construction_queue_unique\` (\`villageId\`, \`buildingId\`, \`targetLevel\`),
                CONSTRAINT \`FK_village_construction_queue_villageId\` FOREIGN KEY (\`villageId\`) REFERENCES \`villages\`(\`id\`) ON DELETE CASCADE ON UPDATE CASCADE
            ) ENGINE=InnoDB
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE \`village_construction_queue\``);
    }
} 