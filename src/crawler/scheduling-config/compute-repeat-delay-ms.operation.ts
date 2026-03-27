import type { RepeatTimingSpec } from './orchestrator-scheduling.types';

/**
 * Computes delay in ms for the next run after a successful task, from resolved repeat spec.
 */
export function computeRepeatDelayMsFromSpec(repeat: RepeatTimingSpec): number {
    switch (repeat.kind) {
        case 'random':
            return (
                Math.floor(Math.random() * (repeat.maxMs - repeat.minMs + 1)) + repeat.minMs
            );
        case 'fixed':
            return repeat.ms;
        case 'scavenging_optimal':
            throw new Error('scavenging_optimal repeat must use updateNextScavengingTimeOperation');
        case 'mass_scavenging':
            return repeat.baseMs + Math.floor(Math.random() * (repeat.jitterMaxMs + 1));
        case 'account_manager_jitter': {
            const span = repeat.centerMs * repeat.jitterRatio;
            const minMs = repeat.centerMs - span;
            const maxMs = repeat.centerMs + span;
            return Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
        }
        default: {
            const _exhaustive: never = repeat;
            return _exhaustive;
        }
    }
}
