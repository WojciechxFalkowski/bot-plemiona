import { VillageData } from '@/crawler/pages/village-overview.page';
import { Page } from 'playwright';

// Interfejs dla opcji zbierania danych wiosek
export interface VillageCollectionOptions {
    includeDetailedData?: boolean;        // Czy zbierać szczegółowe dane (budynki, armia, etc.)
    includeOverviewOnly?: boolean;        // Czy zbierać tylko dane przeglądu
    skipBrokenVillages?: boolean;         // Czy pomijać wioski z błędami
    delayBetweenVillages?: number;        // Opóźnienie między wioskami w ms
    timeoutPerVillage?: number;           // Timeout na wioskę w ms
}

// Interfejs dla wyniku zbierania danych
export interface VillageCollectionResult {
    success: boolean;                     // Czy operacja się udała
    villagesProcessed: number;            // Liczba przetworzonych wiosek
    villagesWithErrors: number;           // Liczba wiosek z błędami
    totalVillages: number;                // Całkowita liczba wiosek
    data: VillageData[];                  // Zebrane dane
    errors: VillageCollectionError[];     // Lista błędów
    processingTime: number;               // Czas przetwarzania w ms
}

// Interfejs dla błędów podczas zbierania danych
export interface VillageCollectionError {
    villageId: string;                    // ID wioski z błędem
    villageName: string;                  // Nazwa wioski z błędem
    error: string;                        // Opis błędu
    stage: 'overview' | 'detailed' | 'navigation'; // Etap w którym wystąpił błąd
}

// Interfejs dla walidacji danych wioski
export interface VillageValidationResult {
    isValid: boolean;                     // Czy dane są poprawne
    village: VillageData;                 // Dane wioski
    issues: VillageValidationIssue[];     // Lista problemów
}

// Interfejs dla problemów z walidacją
export interface VillageValidationIssue {
    field: string;                        // Pole z problemem
    issue: string;                        // Opis problemu
    severity: 'error' | 'warning' | 'info'; // Poziom problemu
}

// Interfejs dla filtrowania wiosek
export interface VillageFilterCriteria {
    minPoints?: number;                   // Minimalna liczba punktów
    maxPoints?: number;                   // Maksymalna liczba punktów
    minPopulation?: number;               // Minimalna populacja
    maxPopulation?: number;               // Maksymalna populacja
    hasFreeFarm?: boolean;                // Czy ma wolną farmę
    hasResources?: boolean;               // Czy ma surowce
    namePattern?: string;                 // Wzorzec nazwy (regex)
    coordinates?: string[];               // Lista współrzędnych do uwzględnienia
    excludeCoordinates?: string[];        // Lista współrzędnych do wykluczenia
}

// Interfejs dla sortowania wiosek
export interface VillageSortCriteria {
    field: 'name' | 'points' | 'resources' | 'coordinates';
    direction: 'asc' | 'desc';
}

// Interfejs dla statystyk wiosek
export interface VillageStatistics {
    totalVillages: number;                // Całkowita liczba wiosek
    totalPoints: number;                  // Suma punktów
    averagePoints: number;                // Średnia punktów
    totalResources: {                     // Suma surowców
        wood: number;
        clay: number;
        iron: number;
    };
    averageResources: {                   // Średnia surowców
        wood: number;
        clay: number;
        iron: number;
    };
    villagesWithFullStorage: number;      // Liczba wiosek z pełnym magazynem
}

// Interfejs dla opcji logowania danych wiosek
export interface VillageLoggingOptions {
    includeResources?: boolean;           // Czy logować surowce
    includeBuildings?: boolean;           // Czy logować budynki
    includeArmy?: boolean;               // Czy logować armię
    includeQueues?: boolean;             // Czy logować kolejki
    detailLevel?: 'minimal' | 'standard' | 'detailed'; // Poziom szczegółowości
}

// Interfejs dla eksportu danych wiosek
export interface VillageExportOptions {
    format: 'json' | 'csv' | 'xml';      // Format eksportu
    includeDetailedData?: boolean;        // Czy uwzględnić szczegółowe dane
    compressOutput?: boolean;             // Czy kompresować wynik
    filename?: string;                    // Nazwa pliku
}

// Interfejs dla importu danych wiosek
export interface VillageImportOptions {
    format: 'json' | 'csv' | 'xml';      // Format importu
    validateData?: boolean;               // Czy walidować dane
    mergeStrategy?: 'replace' | 'merge' | 'append'; // Strategia łączenia
}

// Interfejs dla cache'owania danych wiosek
export interface VillageCacheOptions {
    ttl?: number;                         // Time to live w sekundach
    maxSize?: number;                     // Maksymalny rozmiar cache
    enabled?: boolean;                    // Czy cache jest włączony
} 