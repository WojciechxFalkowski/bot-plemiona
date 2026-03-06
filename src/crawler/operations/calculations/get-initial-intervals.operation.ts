/**
 * Configuration for initial intervals used when starting tasks
 */
export interface InitialIntervals {
    construction: number;
    scavenging: number;
    miniAttack: number;
    playerVillageAttack: number;
    armyTraining: number;
    twDatabase: number;
    accountManager: number;
}

/** Scavenging fallback delay in seconds (used when optimal calculation returns null or very small value) */
export const SCAVENGING_FALLBACK_DELAY_SECONDS = 60;

/**
 * Gets initial intervals for all task types
 * These are used when initializing server plans
 * @returns Initial intervals in milliseconds
 */
export function getInitialIntervalsOperation(): InitialIntervals {
    return {
        construction: 10000, // 10 seconds
        scavenging: 30000, // 30 seconds
        miniAttack: 20000, // 20 seconds
        playerVillageAttack: 5000, // 5 seconds
        armyTraining: 30000, // 30 seconds
        twDatabase: 30 * 60 * 1000, // 30 minutes
        accountManager: 15 * 60 * 1000 // 15 minutes
    };
}


