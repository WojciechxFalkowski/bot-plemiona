/**
 * Polish building names from TWDatabase etykieta -> select value in Plemiona place form.
 * Based on: select[name="building"] options (Ratusz=main, Kuźnia=smith, etc.)
 */
const BUILDING_POLISH_TO_VALUE: Record<string, string> = {
    Ratusz: 'main',
    Kuźnia: 'smith',
    Zagroda: 'farm',
    Koszary: 'barracks',
    Stajnia: 'stable',
    Warsztat: 'garage',
    Kościół: 'church',
    Pałac: 'snob',
    Plac: 'place',
    Piedestał: 'statue',
    Rynek: 'market',
    Tartak: 'wood',
    Cegielnia: 'stone',
    'Huta żelaza': 'iron',
    Spichlerz: 'storage',
    Mur: 'wall'
};

export interface ParseBurzakEtykietaResult {
    catapultCount: number;
    buildingSelectValue: string;
}

/** Regex: Burzak (Wojsko-X, Katapulty-N Budynek) */
const BURZAK_REGEX = /Burzak\s*\([^)]*Katapulty-(\d+)\s+([^)]+?)\s*\)/i;

/**
 * Parses Burzak attack label to extract catapult count and target building.
 *
 * @param etykieta - ETYKIETA ATAKU value e.g. "Burzak (Wojsko-0, Katapulty-50 Zagroda) (1 z 3)"
 * @returns Parsed result or null if not a valid Burzak label
 */
export function parseBurzakEtykietaOperation(etykieta: string): ParseBurzakEtykietaResult | null {
    if (!etykieta || typeof etykieta !== 'string') return null;
    const match = etykieta.trim().match(BURZAK_REGEX);
    if (!match) return null;
    const catapultCount = parseInt(match[1], 10);
    const buildingPolish = match[2].trim();
    const buildingSelectValue = BUILDING_POLISH_TO_VALUE[buildingPolish];
    if (!buildingSelectValue) return null;
    return { catapultCount, buildingSelectValue };
}
