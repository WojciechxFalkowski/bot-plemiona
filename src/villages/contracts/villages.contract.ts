export interface VillageData {
    id: string;
    name: string;
    coordinates: string;
}

export interface VillagesSyncResult {
    totalProcessed: number;
    added: number;
    updated: number;
    deleted: number;
    currentTotal: number;
} 