export class VillageResponseDto {
    id: string;
    serverId: number;
    name: string;
    coordinates: string;
    isAutoBuildEnabled: boolean;
    isAutoScavengingEnabled: boolean;
    createdAt: Date;
    updatedAt: Date;
    dataAge?: string; // Dodatkowa informacja o wieku danych
}

export class VillagesListResponseDto {
    villages: VillageResponseDto[];
    totalCount: number;
    lastUpdated: Date;
    dataAge: string;
}

export class VillageToggleResponseDto {
    id: string;
    isAutoBuildEnabled?: boolean;
    isAutoScavengingEnabled?: boolean;
} 