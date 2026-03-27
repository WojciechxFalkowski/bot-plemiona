import { Logger } from '@nestjs/common';
import { SettingsService } from '@/settings/settings.service';
import { SettingsKey } from '@/settings/settings-keys.enum';
import { getMiniAttackIntervalsOperation } from '../operations/calculations/get-mini-attack-intervals.operation';
import { minutesToMillisecondsOperation } from '../operations/utilities/minutes-to-milliseconds.operation';
import { buildDefaultResolvedOrchestratorScheduling } from './build-default-resolved-orchestrator-scheduling.operation';
import { applyOrchestratorSchedulingJsonPatch } from './apply-orchestrator-scheduling-json-patch.operation';
import type { OrchestratorSchedulingConfigJson, ResolvedOrchestratorSchedulingConfig } from './orchestrator-scheduling.types';

export interface ResolveOrchestratorSchedulingConfigDependencies {
    settingsService: SettingsService;
    logger: Logger;
}

/**
 * Loads merged orchestrator scheduling for a server: defaults + JSON patch + legacy MINI_/ARMY_ interval keys.
 */
export async function resolveOrchestratorSchedulingConfigOperation(
    serverId: number,
    deps: ResolveOrchestratorSchedulingConfigDependencies,
): Promise<ResolvedOrchestratorSchedulingConfig> {
    const { settingsService, logger } = deps;
    let resolved = buildDefaultResolvedOrchestratorScheduling();
    const blob = await settingsService.getSetting<{ value: OrchestratorSchedulingConfigJson }>(
        serverId,
        SettingsKey.ORCHESTRATOR_SCHEDULING_CONFIG,
    );
    if (blob?.value && typeof blob.value === 'object') {
        resolved = applyOrchestratorSchedulingJsonPatch(resolved, blob.value);
    }
    const jsonPatch = blob?.value ?? {};
    if (
        jsonPatch.miniAttacks?.repeatMinMinutes != null &&
        jsonPatch.miniAttacks?.repeatMaxMinutes != null
    ) {
        resolved = {
            ...resolved,
            playerVillageAttacks: {
                ...resolved.playerVillageAttacks,
                repeat: resolved.miniAttacks.repeat,
            },
        };
    }
    const miniFromJson =
        jsonPatch.miniAttacks?.repeatMinMinutes != null && jsonPatch.miniAttacks?.repeatMaxMinutes != null;
    if (!miniFromJson) {
        try {
            const intervals = await getMiniAttackIntervalsOperation(serverId, { settingsService, logger });
            resolved = {
                ...resolved,
                miniAttacks: {
                    ...resolved.miniAttacks,
                    repeat: {
                        kind: 'random',
                        minMs: intervals.minInterval,
                        maxMs: intervals.maxInterval,
                    },
                },
                playerVillageAttacks: {
                    ...resolved.playerVillageAttacks,
                    repeat: {
                        kind: 'random',
                        minMs: intervals.minInterval,
                        maxMs: intervals.maxInterval,
                    },
                },
            };
        } catch {
            /* keep defaults */
        }
    }
    const armyFromJson =
        jsonPatch.armyTraining?.repeatMinMinutes != null && jsonPatch.armyTraining?.repeatMaxMinutes != null;
    if (!armyFromJson) {
        try {
            const minSetting = await settingsService.getSetting<{ value: number }>(
                serverId,
                SettingsKey.ARMY_TRAINING_MIN_INTERVAL,
            );
            const maxSetting = await settingsService.getSetting<{ value: number }>(
                serverId,
                SettingsKey.ARMY_TRAINING_MAX_INTERVAL,
            );
            const minMinutes = minSetting?.value ?? 10;
            const maxMinutes = maxSetting?.value ?? 15;
            resolved = {
                ...resolved,
                armyTraining: {
                    ...resolved.armyTraining,
                    repeat: {
                        kind: 'random',
                        minMs: minutesToMillisecondsOperation(minMinutes),
                        maxMs: minutesToMillisecondsOperation(maxMinutes),
                    },
                },
            };
        } catch {
            /* keep defaults */
        }
    }
    return resolved;
}
