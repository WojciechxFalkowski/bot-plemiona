/**
 * Configuration for initial intervals used when starting tasks
 */
export interface InitialIntervals {
    construction: number;
    miniAttack: number;
    playerVillageAttack: number;
    armyTraining: number;
}

/**
 * Gets initial intervals for all task types
 * These are used when initializing server plans
 * @returns Initial intervals in milliseconds
 */
export function getInitialIntervalsOperation(): InitialIntervals {
    return {
        construction: 10000, // 10 seconds
        miniAttack: 20000, // 20 seconds
        playerVillageAttack: 5000, // 5 seconds
        armyTraining: 30000 // 30 seconds
    };
}


