import {
    ORCHESTRATOR_TASK_KEYS,
    type OrchestratorSchedulingConfigJson,
    type OrchestratorSchedulingTaskPatch,
    type ResolvedOrchestratorSchedulingConfig,
} from './orchestrator-scheduling.types';

/**
 * Converts merged resolved scheduling (ms) to API-friendly patch shape (minutes) for forms.
 */
export function resolvedSchedulingToPatchMinutes(
    resolved: ResolvedOrchestratorSchedulingConfig,
): OrchestratorSchedulingConfigJson {
    const out: OrchestratorSchedulingConfigJson = {};
    for (const key of ORCHESTRATOR_TASK_KEYS) {
        const t = resolved[key];
        const entry: OrchestratorSchedulingTaskPatch = {
            initialMinutes: Math.round(t.initialDelayMs / 60_000),
        };
        if (t.onEnableDelayMs != null) {
            entry.onEnableMinutes = Math.round(t.onEnableDelayMs / 60_000);
        }
        const r = t.repeat;
        if (r.kind === 'random') {
            entry.repeatMinMinutes = Math.round(r.minMs / 60_000);
            entry.repeatMaxMinutes = Math.round(r.maxMs / 60_000);
        } else if (r.kind === 'fixed') {
            entry.repeatFixedMinutes = Math.round(r.ms / 60_000);
        } else if (r.kind === 'mass_scavenging') {
            entry.repeatFixedMinutes = Math.round(r.baseMs / 60_000);
            entry.massScavengingJitterMaxSeconds = Math.round(r.jitterMaxMs / 1000);
        } else if (r.kind === 'account_manager_jitter') {
            const minMs = r.centerMs * (1 - r.jitterRatio);
            const maxMs = r.centerMs * (1 + r.jitterRatio);
            entry.repeatMinMinutes = Math.round(minMs / 60_000);
            entry.repeatMaxMinutes = Math.round(maxMs / 60_000);
        }
        out[key] = entry;
    }
    return out;
}
