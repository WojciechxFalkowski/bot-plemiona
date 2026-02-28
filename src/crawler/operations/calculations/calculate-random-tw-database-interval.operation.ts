const TW_DATABASE_INTERVAL_MIN = 28 * 60 * 1000; // 28 minutes
const TW_DATABASE_INTERVAL_MAX = 32 * 60 * 1000; // 32 minutes

/**
 * Returns random interval for TW Database task (~30 min, 28-32 min range).
 */
export function calculateRandomTwDatabaseIntervalOperation(): number {
    return (
        Math.floor(Math.random() * (TW_DATABASE_INTERVAL_MAX - TW_DATABASE_INTERVAL_MIN + 1)) +
        TW_DATABASE_INTERVAL_MIN
    );
}
