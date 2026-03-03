import { ScavengingTimeData } from '@/utils/scavenging/scavenging.interfaces';
import { ScavengingUtils } from '@/utils/scavenging/scavenging.utils';
import { SCAVENGING_FALLBACK_DELAY_SECONDS } from '../calculations/get-initial-intervals.operation';

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
    return ScavengingUtils.calculateOptimalScheduleTime(
        scavengingTimeData,
        SCAVENGING_FALLBACK_DELAY_SECONDS
    );
}


