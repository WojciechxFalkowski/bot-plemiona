import { VillageScavengingData, ScavengingTimeData } from '@/utils/scavenging/scavenging.interfaces';

export interface GetVillageScavengingDataDependencies {
    scavengingTimeData: ScavengingTimeData;
}

/**
 * Returns collected scavenging time data for a specific village
 * @param villageId ID of the village
 * @param deps Dependencies containing scavenging time data
 * @returns Village scavenging data or null if not found
 */
export function getVillageScavengingDataOperation(
    villageId: string,
    deps: GetVillageScavengingDataDependencies
): VillageScavengingData | null {
    const { scavengingTimeData } = deps;
    return scavengingTimeData.villages.find(v => v.villageId === villageId) || null;
}


