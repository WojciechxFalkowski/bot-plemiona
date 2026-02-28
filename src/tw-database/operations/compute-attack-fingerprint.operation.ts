import { createHash } from 'crypto';

const FINGERPRINT_DELIMITER = '|';

/**
 * Computes a unique fingerprint for an attack row.
 * Used for deduplication and tracking sent attacks.
 *
 * @param row - Scraped row with columns WIOSKA WYSYŁAJĄCA, WIOSKA DOCELOWA, DATA WYJŚCIA OD
 * @returns SHA256 hash string (64 chars)
 */
export function computeAttackFingerprintOperation(row: Record<string, string>): string {
    const source = row['WIOSKA WYSYŁAJĄCA'] ?? '';
    const target = row['WIOSKA DOCELOWA'] ?? '';
    const departureFrom = row['DATA WYJŚCIA OD'] ?? '';
    const payload = [source, target, departureFrom].join(FINGERPRINT_DELIMITER);
    return createHash('sha256').update(payload, 'utf8').digest('hex');
}
