import { BuildingLevels } from '@/crawler/pages/village-overview.page';
import { TRIBAL_WARS_BUILDINGS } from '@/crawler/pages/village-detail.page';

export interface GetCurrentGameLevelDependencies {
    // No dependencies needed - pure function
}

/**
 * Pomocnicza metoda do pobrania aktualnego poziomu z gry na podstawie nazwy budynku
 * @param buildingName Nazwa budynku
 * @param buildingLevels Poziomy budynków z gry
 * @param deps Zależności potrzebne do wykonania operacji (opcjonalne, obecnie nie używane)
 * @returns Aktualny poziom lub 0
 */
export function getCurrentGameLevelOperation(
    buildingName: string,
    buildingLevels: BuildingLevels,
    deps?: GetCurrentGameLevelDependencies
): number {
    // Znajdź buildingId na podstawie nazwy
    for (const [_, config] of Object.entries(TRIBAL_WARS_BUILDINGS)) {
        if ((config as any).name === buildingName) {
            const buildingId = (config as any).id;
            // buildingId jest teraz bezpośrednio kluczem w BuildingLevels
            return buildingLevels[buildingId] || 0;
        }
    }
    return 0;
}

