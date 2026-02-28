export interface FilterAttacksToSendDependencies {
    logger: { log: (msg: string) => void; warn: (msg: string) => void };
}

const FEJK_LABEL = 'fejk';
/** Values for "send now" window (case-insensitive match) */
const SEND_NOW_VALUES_UPPERCASE = ['TERAZ', 'SPÓŹNIONY'];

/**
 * Filters and sorts attack rows for fejk type with SPÓŹNIONY or teraz.
 * Priority: "teraz" first, then "SPÓŹNIONY".
 *
 * @param rows - All scraped rows
 * @param deps - Dependencies with logger
 * @returns Filtered and sorted rows
 */
export function filterAttacksToSendOperation(
    rows: Record<string, string>[],
    deps: FilterAttacksToSendDependencies
): Record<string, string>[] {
    const { logger } = deps;

    const filtered = rows.filter(row => {
        const label = (row['ETYKIETA ATAKU'] ?? '').toLowerCase();
        const czasDoWysylki = (row['CZAS DO WYSYŁKI'] ?? '').trim().toUpperCase();
        const akcjaUrl = (row['AKCJA'] ?? '').trim();

        const hasFejk = label.includes(FEJK_LABEL);
        const isSendNow = SEND_NOW_VALUES_UPPERCASE.includes(czasDoWysylki);
        const hasValidUrl = akcjaUrl.startsWith('http');

        if (!hasFejk || !isSendNow) return false;
        if (!hasValidUrl) {
            logger.warn(`Row skipped - invalid AKCJA URL: ${akcjaUrl}`);
            return false;
        }
        return true;
    });

    // Sort: teraz first, then SPÓŹNIONY
    const sorted = [...filtered].sort((a, b) => {
        const aIsTeraz = (a['CZAS DO WYSYŁKI'] ?? '').trim() === 'teraz';
        const bIsTeraz = (b['CZAS DO WYSYŁKI'] ?? '').trim() === 'teraz';
        if (aIsTeraz && !bIsTeraz) return -1;
        if (!aIsTeraz && bIsTeraz) return 1;
        return 0;
    });

    logger.log(`Filtered ${rows.length} -> ${sorted.length} fejk attacks (SPÓŹNIONY/teraz)`);
    return sorted;
}
