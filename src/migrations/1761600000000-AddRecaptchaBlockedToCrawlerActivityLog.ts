import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRecaptchaBlockedToCrawlerActivityLog1761600000000 implements MigrationInterface {
    name = 'AddRecaptchaBlockedToCrawlerActivityLog1761600000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE \`crawler_activity_log\`
            MODIFY COLUMN \`eventType\` enum('session_expired', 'recaptcha_blocked', 'success', 'error', 'info') NOT NULL
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE \`crawler_activity_log\`
            MODIFY COLUMN \`eventType\` enum('session_expired', 'success', 'error', 'info') NOT NULL
        `);
    }
}
