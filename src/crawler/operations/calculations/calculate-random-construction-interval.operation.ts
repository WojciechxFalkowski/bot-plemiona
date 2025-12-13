const MIN_CONSTRUCTION_INTERVAL = 1000 * 60 * 5; // 5 minutes
const MAX_CONSTRUCTION_INTERVAL = 1000 * 60 * 8; // 8 minutes

/**
 * Generates random interval for construction queue processing
 * @returns Random interval in milliseconds between MIN and MAX
 */
export function calculateRandomConstructionIntervalOperation(): number {
    return Math.floor(Math.random() * (MAX_CONSTRUCTION_INTERVAL - MIN_CONSTRUCTION_INTERVAL + 1)) + MIN_CONSTRUCTION_INTERVAL;
}


