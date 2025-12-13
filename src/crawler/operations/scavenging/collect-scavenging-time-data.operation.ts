import { Page } from 'playwright';
import { VillageScavengingData } from '@/utils/scavenging/scavenging.interfaces';
import { ScavengingUtils } from '@/utils/scavenging/scavenging.utils';

export interface CollectScavengingTimeDataDependencies {
    page: Page;
}

/**
 * Collects detailed scavenging time data for a specific village
 * @param villageId ID of the village
 * @param villageName Name of the village
 * @param deps Dependencies containing page instance
 * @returns Village scavenging data
 */
export async function collectScavengingTimeDataOperation(
    villageId: string,
    villageName: string,
    deps: CollectScavengingTimeDataDependencies
): Promise<VillageScavengingData> {
    const { page } = deps;
    return await ScavengingUtils.collectScavengingTimeData(page, villageId, villageName);
}


