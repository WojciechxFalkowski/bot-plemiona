import { Logger } from '@nestjs/common';
import { ServerCrawlerPlan } from '../query/get-multi-server-status.operation';
import { ScavengingTimeData } from '@/utils/scavenging/scavenging.interfaces';
import { calculateOptimalScheduleTimeOperation } from '../scavenging/calculate-optimal-schedule-time.operation';
import { SCAVENGING_FALLBACK_DELAY_SECONDS } from '../calculations/get-initial-intervals.operation';

export interface UpdateNextScavengingTimeDependencies {
    scavengingTimeData: ScavengingTimeData;
    logger: Logger;
}

/**
 * Updates next scavenging execution time based on optimal calculation
 * @param plan Server crawler plan to update
 * @param deps Dependencies needed for calculation
 */
export function updateNextScavengingTimeOperation(
    plan: ServerCrawlerPlan,
    deps: UpdateNextScavengingTimeDependencies
): void {
    const { scavengingTimeData, logger } = deps;

    try {
        // Sprawdź czy są wioski z pustymi levels (błąd podczas pobierania danych)
        const villagesWithErrors = scavengingTimeData.villages.filter(
            v => !v.levels || v.levels.length === 0
        );

        if (villagesWithErrors.length > 0) {
            logger.warn(
                `Found ${villagesWithErrors.length} villages with data collection errors: ` +
                `${villagesWithErrors.map(v => v.villageName).join(', ')}. ` +
                `Using shorter interval (10 minutes) to re-check these villages.`
            );
            // Użyj 10 minut jako bezpieczny czas na ponowne sprawdzenie
            const shortIntervalSeconds = 10 * 60; // 10 minut
            plan.scavenging.optimalDelay = shortIntervalSeconds;
            plan.scavenging.nextExecutionTime = new Date(Date.now() + (shortIntervalSeconds * 1000));
            plan.scavenging.lastExecuted = new Date();
            logger.debug(
                `📅 Next scavenging for ${plan.serverCode} (error recovery): ` +
                `${plan.scavenging.nextExecutionTime.toLocaleString()} (${shortIntervalSeconds}s)`
            );
            return;
        }

        // Normalna logika - wszystkie wioski mają poprawne dane
        let optimalDelay = calculateOptimalScheduleTimeOperation({ scavengingTimeData });

        if (optimalDelay === null || optimalDelay < 30) {
            optimalDelay = SCAVENGING_FALLBACK_DELAY_SECONDS;
            logger.warn(`Using fallback scavenging delay for ${plan.serverCode}: ${optimalDelay}s`);
        }

        // Add random buffer to make it less predictable
        const bufferSeconds = Math.floor(Math.random() * 60) + 30; // 30-90 seconds
        optimalDelay += bufferSeconds;

        plan.scavenging.optimalDelay = optimalDelay;
        plan.scavenging.nextExecutionTime = new Date(Date.now() + (optimalDelay * 1000));
        plan.scavenging.lastExecuted = new Date();

        logger.debug(`📅 Next scavenging for ${plan.serverCode}: ${plan.scavenging.nextExecutionTime.toLocaleString()} (optimal: ${optimalDelay}s)`);
    } catch (error) {
        logger.error(`Error calculating optimal scavenging time for ${plan.serverCode}:`, error);
        plan.scavenging.nextExecutionTime = new Date(Date.now() + SCAVENGING_FALLBACK_DELAY_SECONDS * 1000);
        plan.scavenging.lastExecuted = new Date();
        logger.debug(`📅 Next scavenging for ${plan.serverCode} (fallback): ${plan.scavenging.nextExecutionTime.toLocaleString()}`);
    }
}


