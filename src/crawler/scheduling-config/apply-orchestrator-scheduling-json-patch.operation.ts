import type {
    OrchestratorSchedulingConfigJson,
    OrchestratorTaskKey,
    ResolvedOrchestratorSchedulingConfig,
    RepeatTimingSpec,
    TaskTimingResolved,
} from './orchestrator-scheduling.types';

function minutesToMs(minutes: number): number {
    return Math.round(minutes * 60 * 1000);
}

function cloneResolved(base: ResolvedOrchestratorSchedulingConfig): ResolvedOrchestratorSchedulingConfig {
    return JSON.parse(JSON.stringify(base)) as ResolvedOrchestratorSchedulingConfig;
}

function applyTaskPatch(
    task: TaskTimingResolved,
    patch: NonNullable<OrchestratorSchedulingConfigJson[OrchestratorTaskKey]>,
    taskKey: OrchestratorTaskKey,
): TaskTimingResolved {
    let next = { ...task };
    if (patch.initialMinutes !== undefined) {
        next = { ...next, initialDelayMs: minutesToMs(patch.initialMinutes) };
    }
    if (patch.onEnableMinutes !== undefined) {
        next = { ...next, onEnableDelayMs: minutesToMs(patch.onEnableMinutes) };
    }
    if (taskKey === 'scavenging') {
        return next;
    }
    if (patch.repeatFixedMinutes !== undefined) {
        const ms = minutesToMs(patch.repeatFixedMinutes);
        const repeat: RepeatTimingSpec = { kind: 'fixed', ms };
        next = { ...next, repeat };
    }
    if (patch.repeatMinMinutes !== undefined && patch.repeatMaxMinutes !== undefined) {
        const repeat: RepeatTimingSpec = {
            kind: 'random',
            minMs: minutesToMs(patch.repeatMinMinutes),
            maxMs: minutesToMs(patch.repeatMaxMinutes),
        };
        next = { ...next, repeat };
    }
    return next;
}

function applyMassJitterPatch(
    task: TaskTimingResolved,
    jitterMaxSeconds?: number,
): TaskTimingResolved {
    if (jitterMaxSeconds === undefined || task.repeat.kind !== 'mass_scavenging') {
        return task;
    }
    return {
        ...task,
        repeat: {
            kind: 'mass_scavenging',
            baseMs: task.repeat.baseMs,
            jitterMaxMs: Math.max(0, jitterMaxSeconds) * 1000,
        },
    };
}

/**
 * Applies user JSON patch (minutes) onto a resolved config clone.
 */
export function applyOrchestratorSchedulingJsonPatch(
    base: ResolvedOrchestratorSchedulingConfig,
    patch: OrchestratorSchedulingConfigJson,
): ResolvedOrchestratorSchedulingConfig {
    let out = cloneResolved(base);
    (Object.keys(patch) as OrchestratorTaskKey[]).forEach((key) => {
        const p = patch[key];
        if (!p) {
            return;
        }
        let task = applyTaskPatch(out[key], p, key);
        if (key === 'massScavenging' && p.massScavengingJitterMaxSeconds !== undefined) {
            task = applyMassJitterPatch(task, p.massScavengingJitterMaxSeconds);
        }
        out = { ...out, [key]: task };
    });
    return out;
}
