import { ScavengingTimeData } from '@/utils/scavenging/scavenging.interfaces';

export interface GetScavengingTimeDataDependencies {
    scavengingTimeData: ScavengingTimeData;
}

/**
 * Returns collected scavenging time data
 * @param deps Dependencies containing scavenging time data
 * @returns Current scavenging time data
 */
export function getScavengingTimeDataOperation(
    deps: GetScavengingTimeDataDependencies
): ScavengingTimeData {
    const { scavengingTimeData } = deps;
    return scavengingTimeData;
}


