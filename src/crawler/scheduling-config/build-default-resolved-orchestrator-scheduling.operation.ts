import { getInitialIntervalsOperation } from '../operations/calculations/get-initial-intervals.operation';
import type { ResolvedOrchestratorSchedulingConfig, TaskTimingResolved } from './orchestrator-scheduling.types';

const CONSTRUCTION_MIN_MS = 1000 * 60 * 5;
const CONSTRUCTION_MAX_MS = 1000 * 60 * 8;

const MINI_DEFAULT_MIN_MS = 1000 * 60 * 10;
const MINI_DEFAULT_MAX_MS = 1000 * 60 * 15;

const ARMY_DEFAULT_MIN_MS = 1000 * 60 * 10;
const ARMY_DEFAULT_MAX_MS = 1000 * 60 * 15;

const TW_DB_MIN_MS = 28 * 60 * 1000;
const TW_DB_MAX_MS = 32 * 60 * 1000;

const ACCOUNT_MANAGER_CENTER_MS = 15 * 60 * 1000;

/**
 * Default scheduling snapshot matching pre-unification behavior (milliseconds).
 */
export function buildDefaultResolvedOrchestratorScheduling(): ResolvedOrchestratorSchedulingConfig {
    const init = getInitialIntervalsOperation();
    const construction: TaskTimingResolved = {
        initialDelayMs: init.construction,
        repeat: { kind: 'random', minMs: CONSTRUCTION_MIN_MS, maxMs: CONSTRUCTION_MAX_MS },
    };
    const scavenging: TaskTimingResolved = {
        initialDelayMs: init.scavenging,
        repeat: { kind: 'scavenging_optimal' },
    };
    const massScavenging: TaskTimingResolved = {
        initialDelayMs: init.massScavenging,
        repeat: { kind: 'mass_scavenging', baseMs: init.massScavenging, jitterMaxMs: 60_000 },
    };
    const miniAttacks: TaskTimingResolved = {
        initialDelayMs: init.miniAttack,
        repeat: { kind: 'random', minMs: MINI_DEFAULT_MIN_MS, maxMs: MINI_DEFAULT_MAX_MS },
    };
    const playerVillageAttacks: TaskTimingResolved = {
        initialDelayMs: init.playerVillageAttack,
        repeat: { kind: 'random', minMs: MINI_DEFAULT_MIN_MS, maxMs: MINI_DEFAULT_MAX_MS },
        onEnableDelayMs: 10 * 60 * 1000,
    };
    const armyTraining: TaskTimingResolved = {
        initialDelayMs: init.armyTraining,
        repeat: { kind: 'random', minMs: ARMY_DEFAULT_MIN_MS, maxMs: ARMY_DEFAULT_MAX_MS },
    };
    const twDatabase: TaskTimingResolved = {
        initialDelayMs: init.twDatabase,
        repeat: { kind: 'random', minMs: TW_DB_MIN_MS, maxMs: TW_DB_MAX_MS },
    };
    const accountManager: TaskTimingResolved = {
        initialDelayMs: init.accountManager,
        repeat: { kind: 'account_manager_jitter', centerMs: ACCOUNT_MANAGER_CENTER_MS, jitterRatio: 0.1 },
    };
    return {
        constructionQueue: construction,
        scavenging,
        massScavenging,
        miniAttacks,
        playerVillageAttacks,
        armyTraining,
        twDatabase,
        accountManager,
    };
}
