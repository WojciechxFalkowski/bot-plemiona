import { Logger } from '@nestjs/common';
import { SettingsService } from '@/settings/settings.service';
import { SettingsKey } from '@/settings/settings-keys.enum';
import { EncryptionService } from '@/utils/encryption/encryption.service';
import { ConfigService } from '@nestjs/config';

export interface ValidateTwDatabaseEnabledDependencies {
    settingsService: SettingsService;
    encryptionService: EncryptionService;
    configService: ConfigService;
    logger: Logger;
}

/**
 * Checks if TW Database integration is enabled for a server.
 * Requires: enabled=true AND (settings credentials OR env fallback).
 */
export async function validateTwDatabaseEnabledOperation(
    serverId: number,
    deps: ValidateTwDatabaseEnabledDependencies
): Promise<boolean> {
    const { settingsService, encryptionService, configService, logger } = deps;

    try {
        const setting = await settingsService.getSetting<{
            enabled?: boolean;
            login?: string;
            passwordEncrypted?: string;
        }>(serverId, SettingsKey.TW_DATABASE);

        if (setting?.enabled !== true) {
            return false;
        }

        if (setting?.login && setting?.passwordEncrypted && encryptionService.isAvailable()) {
            try {
                encryptionService.decrypt(setting.passwordEncrypted);
                return true;
            } catch {
                logger.warn(`Could not decrypt TW Database password for server ${serverId}`);
            }
        }

        const envLogin = configService.get<string>('TW_DATABASE_LOGIN');
        const envPassword = configService.get<string>('TW_DATABASE_PASSWORD');
        if (envLogin && envPassword) {
            return true;
        }

        return false;
    } catch (error) {
        logger.error(`Failed to check TW Database setting for server ${serverId}:`, error);
        return false;
    }
}
