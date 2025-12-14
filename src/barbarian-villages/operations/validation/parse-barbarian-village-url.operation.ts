import { BadRequestException } from '@nestjs/common';
import { Logger } from '@nestjs/common';

export interface ParseBarbarianVillageUrlDependencies {
    logger: Logger;
}

export interface ParsedBarbarianVillageUrl {
    target: string;
    coordinateX: number;
    coordinateY: number;
    villageId: string;
}

/**
 * Parsuje URL wioski barbarzyńskiej i ekstrahuje parametry
 * @param url URL z gry Plemiona
 * @param deps Zależności potrzebne do wykonania operacji
 * @returns Sparsowane dane z URL lub null jeśli format jest nieprawidłowy
 * @throws BadRequestException jeśli URL ma nieprawidłowy format
 */
export function parseBarbarianVillageUrlOperation(
    url: string,
    deps: ParseBarbarianVillageUrlDependencies
): ParsedBarbarianVillageUrl {
    const { logger } = deps;

    try {
        const urlParams = new URL(url);
        const idParam = urlParams.searchParams.get('id');
        const villageId = urlParams.searchParams.get('village');

        if (!idParam) {
            throw new BadRequestException('URL does not contain required "id" parameter');
        }

        if (!villageId) {
            throw new BadRequestException('URL does not contain required "village" parameter');
        }

        const hash = urlParams.hash;
        if (!hash || !hash.startsWith('#')) {
            throw new BadRequestException('URL does not contain coordinates in hash fragment');
        }

        const coordinates = hash.substring(1).split(';');
        if (coordinates.length !== 2) {
            throw new BadRequestException('Invalid coordinate format. Expected format: #X;Y');
        }

        const coordinateX = parseInt(coordinates[0], 10);
        const coordinateY = parseInt(coordinates[1], 10);

        if (isNaN(coordinateX) || isNaN(coordinateY)) {
            throw new BadRequestException('Coordinates must be valid numbers');
        }

        if (coordinateX < 0 || coordinateX > 1000 || coordinateY < 0 || coordinateY > 1000) {
            throw new BadRequestException('Coordinates must be between 0 and 1000');
        }

        return {
            target: idParam,
            coordinateX,
            coordinateY,
            villageId
        };

    } catch (error) {
        if (error instanceof BadRequestException) {
            throw error;
        }
        logger.error(`Error parsing URL: ${error.message}`);
        throw new BadRequestException(`Invalid URL format: ${error.message}`);
    }
}



