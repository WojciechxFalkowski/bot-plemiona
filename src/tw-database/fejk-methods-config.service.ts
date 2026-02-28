import { Injectable, Logger } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';
import type { FejkMethodsConfig } from './interfaces/fejk-methods-config.interface';

const CONFIG_FILE = 'fejk-methods.json';

/**
 * Loads and provides fejk methods configuration from config/fejk-methods.json
 */
@Injectable()
export class FejkMethodsConfigService {
    private readonly logger = new Logger(FejkMethodsConfigService.name);
    private cached: FejkMethodsConfig | null = null;

    /**
     * Returns fejk methods config. Loads from file on first call, then caches.
     */
    getConfig(): FejkMethodsConfig {
        if (this.cached) return this.cached;
        const configDir = join(process.cwd(), 'config');
        const configPath = join(configDir, CONFIG_FILE);
        try {
            const content = readFileSync(configPath, 'utf-8');
            const parsed = JSON.parse(content) as FejkMethodsConfig;
            this.validateConfig(parsed);
            this.cached = parsed;
            return this.cached;
        } catch (err) {
            this.logger.error(`Failed to load ${CONFIG_FILE}: ${err instanceof Error ? err.message : String(err)}`);
            throw err;
        }
    }

    private validateConfig(config: FejkMethodsConfig): void {
        if (!config.method1?.units || !config.method2?.units) {
            throw new Error('fejk-methods.json must have method1.units and method2.units');
        }
        if (!Array.isArray(config.method1.siegeUnits) || !Array.isArray(config.method2.siegeUnits)) {
            throw new Error('fejk-methods.json must have siegeUnits arrays for both methods');
        }
        if (config.method1.minSpyInVillage != null && config.method1.minSpyInVillage < 0) {
            throw new Error('method1.minSpyInVillage must be >= 0');
        }
    }

    /** Clears cache (e.g. for tests or hot-reload) */
    clearCache(): void {
        this.cached = null;
    }
}
