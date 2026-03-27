import type { OrchestratorTaskKey, ResolvedOrchestratorSchedulingConfig } from './orchestrator-scheduling.types';
import { computeRepeatDelayMsFromSpec } from './compute-repeat-delay-ms.operation';

/**
 * Delay after a task is enabled (disabled -> enabled), matching legacy orchestrator behavior.
 */
export function getOnEnableDelayMs(
    key: OrchestratorTaskKey,
    resolved: ResolvedOrchestratorSchedulingConfig,
): number {
    const t = resolved[key];
    if (t.onEnableDelayMs !== undefined) {
        return t.onEnableDelayMs;
    }
    switch (key) {
        case 'constructionQueue':
            return computeRepeatDelayMsFromSpec(t.repeat);
        case 'scavenging':
            return t.initialDelayMs;
        case 'massScavenging':
            return t.initialDelayMs;
        case 'miniAttacks':
            return computeRepeatDelayMsFromSpec(t.repeat);
        case 'playerVillageAttacks':
            return 10 * 60 * 1000;
        case 'armyTraining':
            return computeRepeatDelayMsFromSpec(t.repeat);
        case 'twDatabase':
            return computeRepeatDelayMsFromSpec(t.repeat);
        case 'accountManager':
            return computeRepeatDelayMsFromSpec(t.repeat);
        default: {
            const _never: never = key;
            return _never;
        }
    }
}
