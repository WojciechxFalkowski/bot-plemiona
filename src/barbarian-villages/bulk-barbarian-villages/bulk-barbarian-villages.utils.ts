import { BadRequestException } from '@nestjs/common';
import { ParsedUrl } from './bulk-barbarian-villages.interfaces';

/**
 * Utility functions for bulk barbarian villages processing
 */
export class BulkBarbarianVillagesUtils {
    /**
     * Extracts serverCode from hostname (e.g., pl223.plemiona.pl -> pl223)
     */
    static extractServerCodeFromHostname(hostname: string): string | null {
        if (!hostname.includes('plemiona.pl')) {
            return null;
        }

        const match = hostname.match(/^([^.]+)\.plemiona\.pl$/);
        return match ? match[1] : null;
    }

    /**
     * Parses a single URL to extract serverCode, villageId, and coordinates
     */
    static parseUrl(url: string): ParsedUrl {
        try {
            const urlObj = new URL(url);
            const hostname = urlObj.hostname;
            const serverCode = this.extractServerCodeFromHostname(hostname);

            if (!serverCode) {
                throw new BadRequestException(`Invalid hostname in URL: ${hostname}. Expected format: *.plemiona.pl`);
            }

            const villageId = urlObj.searchParams.get('village');
            if (!villageId) {
                throw new BadRequestException(`URL does not contain required "village" parameter: ${url}`);
            }

            // Extract coordinates from hash (after #)
            const hash = urlObj.hash;
            if (!hash || !hash.startsWith('#')) {
                throw new BadRequestException(`URL does not contain coordinates in hash fragment: ${url}`);
            }

            // Remove # and split by semicolon
            const coordinates = hash.substring(1).split(';');
            if (coordinates.length !== 2) {
                throw new BadRequestException(`Invalid coordinate format. Expected format: #X;Y in URL: ${url}`);
            }

            const coordinateX = parseInt(coordinates[0], 10);
            const coordinateY = parseInt(coordinates[1], 10);

            if (isNaN(coordinateX) || isNaN(coordinateY)) {
                throw new BadRequestException(`Coordinates must be valid numbers in URL: ${url}`);
            }

            if (coordinateX < 0 || coordinateX > 1000 || coordinateY < 0 || coordinateY > 1000) {
                throw new BadRequestException(`Coordinates must be between 0 and 1000 in URL: ${url}`);
            }

            return {
                url,
                serverCode,
                villageId,
                coordinateX,
                coordinateY
            };
        } catch (error) {
            if (error instanceof BadRequestException) {
                throw error;
            }
            throw new BadRequestException(`Invalid URL format: ${url}. Error: ${error.message}`);
        }
    }
}

