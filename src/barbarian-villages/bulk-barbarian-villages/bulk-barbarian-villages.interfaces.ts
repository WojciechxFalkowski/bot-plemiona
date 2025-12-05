/**
 * Interfaces for bulk barbarian villages extraction
 */

export interface ParsedUrl {
    url: string;
    serverCode: string;
    villageId: string;
    coordinateX: number;
    coordinateY: number;
}

export interface ValidationResult {
    isValid: boolean;
    errors: string[];
    parsedUrls: ParsedUrl[];
    commonServerCode?: string;
    commonVillageId?: string;
}

export interface ExtractionResult {
    links: string[];
}

