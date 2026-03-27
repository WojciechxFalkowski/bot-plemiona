/**
 * Task keys aligned with ServerCrawlerPlan task names / orchestrator labels.
 */
export const ORCHESTRATOR_TASK_KEYS = [
    'constructionQueue',
    'scavenging',
    'massScavenging',
    'miniAttacks',
    'playerVillageAttacks',
    'armyTraining',
    'twDatabase',
    'accountManager',
] as const;

export type OrchestratorTaskKey = (typeof ORCHESTRATOR_TASK_KEYS)[number];

/**
 * How long to wait after a successful run before scheduling the next (non-scavenging-optimal tasks).
 */
export type RepeatTimingSpec =
    | { kind: 'random'; minMs: number; maxMs: number }
    | { kind: 'fixed'; ms: number }
    /** Classic scavenging uses optimal ETA + buffer — not driven by this delay alone */
    | { kind: 'scavenging_optimal' }
    /** Mass scavenging: base delay plus 0..jitterMaxMs */
    | { kind: 'mass_scavenging'; baseMs: number; jitterMaxMs: number }
    /** Account manager: center ms with +/- jitterRatio (e.g. 0.1 = +/-10%) */
    | { kind: 'account_manager_jitter'; centerMs: number; jitterRatio: number };

export interface TaskTimingResolved {
    /** Used when initializing a new server plan (first schedule) */
    initialDelayMs: number;
    repeat: RepeatTimingSpec;
    /**
     * When a task flips from disabled to enabled (if omitted, behavior is task-specific — see getOnEnableDelayMs).
     */
    onEnableDelayMs?: number;
}

/**
 * Full resolved config used by scheduler operations (milliseconds).
 */
export type ResolvedOrchestratorSchedulingConfig = Record<OrchestratorTaskKey, TaskTimingResolved>;

/**
 * User-editable subset stored in settings JSON (minutes for display/API).
 */
export interface OrchestratorSchedulingTaskPatch {
    /** Delay before first run when plan is created or task is toggled on */
    initialMinutes?: number;
    /** Random repeat: minimum gap in minutes */
    repeatMinMinutes?: number;
    /** Random repeat: maximum gap in minutes */
    repeatMaxMinutes?: number;
    /** Fixed repeat gap in minutes (when repeatMin/Max omitted and fixed is intended — optional) */
    repeatFixedMinutes?: number;
    /** Mass scavenging: max jitter in seconds (default 60) */
    massScavengingJitterMaxSeconds?: number;
    /** Delay after toggling task on (minutes); overrides task-specific legacy defaults */
    onEnableMinutes?: number;
}

export type OrchestratorSchedulingConfigJson = Partial<Record<OrchestratorTaskKey, OrchestratorSchedulingTaskPatch>>;
