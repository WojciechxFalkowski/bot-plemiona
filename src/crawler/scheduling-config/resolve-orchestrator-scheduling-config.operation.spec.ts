import { Logger } from '@nestjs/common';
import { SettingsKey } from '@/settings/settings-keys.enum';
import type { SettingsService } from '@/settings/settings.service';
import { resolveOrchestratorSchedulingConfigOperation } from './resolve-orchestrator-scheduling-config.operation';
import { buildDefaultResolvedOrchestratorScheduling } from './build-default-resolved-orchestrator-scheduling.operation';
import { resolvedSchedulingToPatchMinutes } from './resolved-scheduling-to-patch-minutes.operation';

describe('resolveOrchestratorSchedulingConfigOperation', () => {
    const logger = new Logger('test');

    const createMockSettings = (handlers: Partial<Record<SettingsKey, unknown>>): SettingsService =>
        ({
            getSetting: jest.fn(async (_serverId: number, key: SettingsKey) => {
                if (!Object.prototype.hasOwnProperty.call(handlers, key)) {
                    return null;
                }
                return handlers[key];
            }),
        }) as unknown as SettingsService;

    it('returns defaults merged with legacy mini/army when no JSON blob', async () => {
        const mock = createMockSettings({
            [SettingsKey.ORCHESTRATOR_SCHEDULING_CONFIG]: null,
            [SettingsKey.MINI_ATTACKS_MIN_INTERVAL]: { value: 12 },
            [SettingsKey.MINI_ATTACKS_MAX_INTERVAL]: { value: 18 },
            [SettingsKey.ARMY_TRAINING_MIN_INTERVAL]: { value: 20 },
            [SettingsKey.ARMY_TRAINING_MAX_INTERVAL]: { value: 25 },
        });
        const resolved = await resolveOrchestratorSchedulingConfigOperation(1, {
            settingsService: mock,
            logger,
        });
        expect(resolved.miniAttacks.repeat).toEqual({
            kind: 'random',
            minMs: 12 * 60 * 1000,
            maxMs: 18 * 60 * 1000,
        });
        expect(resolved.playerVillageAttacks.repeat).toEqual(resolved.miniAttacks.repeat);
        expect(resolved.armyTraining.repeat).toEqual({
            kind: 'random',
            minMs: 20 * 60 * 1000,
            maxMs: 25 * 60 * 1000,
        });
    });

    it('applies JSON patch for mini repeat when blob present', async () => {
        const mock = createMockSettings({
            [SettingsKey.ORCHESTRATOR_SCHEDULING_CONFIG]: {
                value: {
                    miniAttacks: { repeatMinMinutes: 5, repeatMaxMinutes: 9 },
                },
            } as { value: Record<string, unknown> },
            [SettingsKey.MINI_ATTACKS_MIN_INTERVAL]: { value: 12 },
            [SettingsKey.MINI_ATTACKS_MAX_INTERVAL]: { value: 18 },
        });
        const resolved = await resolveOrchestratorSchedulingConfigOperation(1, {
            settingsService: mock,
            logger,
        });
        expect(resolved.miniAttacks.repeat).toEqual({
            kind: 'random',
            minMs: 5 * 60 * 1000,
            maxMs: 9 * 60 * 1000,
        });
        expect(resolved.playerVillageAttacks.repeat).toEqual(resolved.miniAttacks.repeat);
    });
});

describe('resolvedSchedulingToPatchMinutes', () => {
    it('round-trips defaults to finite minute fields', () => {
        const defaults = buildDefaultResolvedOrchestratorScheduling();
        const minutes = resolvedSchedulingToPatchMinutes(defaults);
        expect(minutes.constructionQueue?.initialMinutes).toBeGreaterThanOrEqual(0);
        expect(minutes.constructionQueue?.repeatMinMinutes).toBe(5);
        expect(minutes.constructionQueue?.repeatMaxMinutes).toBe(8);
        expect(minutes.scavenging?.repeatMinMinutes).toBeUndefined();
        expect(minutes.massScavenging?.massScavengingJitterMaxSeconds).toBe(60);
    });
});
