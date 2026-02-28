import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 32;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

/**
 * Service for encrypting and decrypting sensitive data (e.g. passwords in settings).
 * Uses AES-256-GCM. Key from ENCRYPTION_KEY env (64 hex chars = 32 bytes).
 */
@Injectable()
export class EncryptionService {
    private readonly key: Buffer | null;

    constructor(private readonly configService: ConfigService) {
        const keyHex = this.configService.get<string>('ENCRYPTION_KEY');
        if (keyHex && /^[0-9a-fA-F]{64}$/.test(keyHex)) {
            this.key = Buffer.from(keyHex, 'hex');
        } else {
            this.key = null;
        }
    }

    /**
     * Encrypts plain text. Throws if ENCRYPTION_KEY is not configured.
     */
    encrypt(plainText: string): string {
        if (!this.key) {
            throw new Error('ENCRYPTION_KEY is not configured or invalid (must be 64 hex characters)');
        }
        if (!plainText) {
            return '';
        }
        const iv = randomBytes(IV_LENGTH);
        const cipher = createCipheriv(ALGORITHM, this.key, iv, { authTagLength: TAG_LENGTH });
        const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
        const tag = cipher.getAuthTag();
        return Buffer.concat([iv, tag, encrypted]).toString('base64');
    }

    /**
     * Decrypts cipher text. Throws if ENCRYPTION_KEY is not configured or decryption fails.
     */
    decrypt(cipherText: string): string {
        if (!this.key) {
            throw new Error('ENCRYPTION_KEY is not configured or invalid (must be 64 hex characters)');
        }
        if (!cipherText) {
            return '';
        }
        const buffer = Buffer.from(cipherText, 'base64');
        if (buffer.length < IV_LENGTH + TAG_LENGTH) {
            throw new Error('Invalid cipher text format');
        }
        const iv = buffer.subarray(0, IV_LENGTH);
        const tag = buffer.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
        const encrypted = buffer.subarray(IV_LENGTH + TAG_LENGTH);
        const decipher = createDecipheriv(ALGORITHM, this.key, iv, { authTagLength: TAG_LENGTH });
        decipher.setAuthTag(tag);
        return decipher.update(encrypted, undefined, 'utf8') + decipher.final('utf8');
    }

    /**
     * Returns true if encryption is available (key configured).
     */
    isAvailable(): boolean {
        return this.key !== null;
    }
}
