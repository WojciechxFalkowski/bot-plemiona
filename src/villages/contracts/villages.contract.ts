export interface VillageData {
    id: string;
    name: string;
    coordinates: string;
}

export interface VillagesSyncResult {
    added: number;
    updated: number;
    deleted: number;
    total: number;
} 