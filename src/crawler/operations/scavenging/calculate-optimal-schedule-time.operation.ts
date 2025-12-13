import { ScavengingTimeData } from '@/utils/scavenging/scavenging.interfaces';
import { ScavengingUtils } from '@/utils/scavenging/scavenging.utils';

export interface CalculateOptimalScheduleTimeDependencies {
    scavengingTimeData: ScavengingTimeData;
}

/**
 * Calculates optimal schedule time for next scavenging run
 * @param deps Dependencies containing scavenging time data
 * @returns Optimal time in seconds or null if cannot calculate
 */
export function calculateOptimalScheduleTimeOperation(
    deps: CalculateOptimalScheduleTimeDependencies
): number | null {
    const { scavengingTimeData } = deps;
    return ScavengingUtils.calculateOptimalScheduleTime(scavengingTimeData);
}


