export interface FilterAttacksToSendDependencies {
    logger: { log: (msg: string) => void; warn: (msg: string) => void };
}

export type AttackType = 'fejk' | 'burzak';

export interface FilteredAttackRow extends Record<string, string> {
    attackType: AttackType;
}

const FEJK_LABEL = 'fejk';
const BURZAK_LABEL = 'burzak';
/** Values for "send now" window (case-insensitive match) */
const SEND_NOW_VALUES_UPPERCASE = ['TERAZ', 'SPÓŹNIONY'];

/**
 * Determines attack type from etykieta. Returns null for unsupported types.
 */
export function getAttackType(row: Record<string, string>): AttackType | null {
    const label = (row['ETYKIETA ATAKU'] ?? '').toLowerCase();
    if (label.includes(FEJK_LABEL)) return 'fejk';
    if (label.includes(BURZAK_LABEL)) return 'burzak';
    return null;
}

/**
 * Filters and sorts attack rows for fejk or burzak with SPÓŹNIONY or teraz.
 * Priority: "teraz" first, then "SPÓŹNIONY".
 *
 * @param rows - All scraped rows
 * @param deps - Dependencies with logger
 * @returns Filtered and sorted rows with attackType
 */
export function filterAttacksToSendOperation(
    rows: Record<string, string>[],
    deps: FilterAttacksToSendDependencies
): FilteredAttackRow[] {
    const { logger } = deps;

    const filtered: FilteredAttackRow[] = [];
    for (const row of rows) {
        const label = (row['ETYKIETA ATAKU'] ?? '').toLowerCase();
        const czasDoWysylki = (row['CZAS DO WYSYŁKI'] ?? '').trim().toUpperCase();
        const akcjaUrl = (row['AKCJA'] ?? '').trim();

        const hasFejk = label.includes(FEJK_LABEL);
        const hasBurzak = label.includes(BURZAK_LABEL);
        const isSendNow = SEND_NOW_VALUES_UPPERCASE.includes(czasDoWysylki);
        const hasValidUrl = akcjaUrl.startsWith('http');

        if ((!hasFejk && !hasBurzak) || !isSendNow) continue;
        if (!hasValidUrl) {
            logger.warn(`Row skipped - invalid AKCJA URL: ${akcjaUrl}`);
            continue;
        }
        const attackType: AttackType = hasFejk ? 'fejk' : 'burzak';
        filtered.push({ ...row, attackType });
    }

    // Sort: teraz first, then SPÓŹNIONY
    const sorted = [...filtered].sort((a, b) => {
        const aCzas = (a['CZAS DO WYSYŁKI'] ?? '').trim().toUpperCase();
        const bCzas = (b['CZAS DO WYSYŁKI'] ?? '').trim().toUpperCase();
        const aIsTeraz = aCzas === 'TERAZ';
        const bIsTeraz = bCzas === 'TERAZ';
        if (aIsTeraz && !bIsTeraz) return -1;
        if (!aIsTeraz && bIsTeraz) return 1;
        return 0;
    });

    const fejkCount = sorted.filter(r => r.attackType === 'fejk').length;
    const burzakCount = sorted.filter(r => r.attackType === 'burzak').length;
    logger.log(
        `Filtered ${rows.length} -> ${sorted.length} attacks (SPÓŹNIONY/teraz): fejk=${fejkCount}, burzak=${burzakCount}`
    );
    return sorted;
}
