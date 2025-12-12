import { Page } from 'playwright';
import { Logger } from '@nestjs/common';

export interface ExtractBarbarianVillagesFromGameDependencies {
    page: Page;
    logger: Logger;
}

/**
 * Ekstrahuje dane wiosek barbarzyńskich z gry przez Playwright
 * @param deps Zależności potrzebne do wykonania operacji
 * @returns Tablica danych wiosek barbarzyńskich
 */
export async function extractBarbarianVillagesFromGameOperation(
    deps: ExtractBarbarianVillagesFromGameDependencies
): Promise<any[]> {
    const { page, logger } = deps;

    logger.log('Extracting barbarian villages from game...');

    return [];
}

