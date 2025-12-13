import { ScavengingTimeData } from '@/utils/scavenging/scavenging.interfaces';

export interface ResetScavengingDataDependencies {
    scavengingTimeData: ScavengingTimeData;
}

/**
 * Resets scavenging time data to initial state
 * @param deps Dependencies containing scavenging time data
 */
export function resetScavengingDataOperation(
    deps: ResetScavengingDataDependencies
): void {
    const { scavengingTimeData } = deps;
    
    scavengingTimeData.lastCollected = new Date();
    scavengingTimeData.villages = [];
}


