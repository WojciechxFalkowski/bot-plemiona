import { getInitialIntervalsOperation } from '../operations/calculations/get-initial-intervals.operation';

/**
 * Same shape as CrawlerOrchestratorService.getDefaultIntervals — single source for API/docs.
 */
export function getDefaultIntervalSnapshotMs(): {
    constructionQueue: number;
    scavenging: number;
    massScavenging: number;
    miniAttacks: number;
    playerVillageAttacks: number;
    armyTraining: number;
    twDatabase: number;
} {
    const intervals = getInitialIntervalsOperation();
    return {
        constructionQueue: intervals.construction,
        scavenging: intervals.scavenging,
        massScavenging: intervals.massScavenging,
        miniAttacks: intervals.miniAttack,
        playerVillageAttacks: intervals.playerVillageAttack,
        armyTraining: intervals.armyTraining,
        twDatabase: intervals.twDatabase,
    };
}
