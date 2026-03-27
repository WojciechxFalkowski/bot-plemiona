import { Injectable, Logger } from '@nestjs/common';
import { SettingsService } from '@/settings/settings.service';
import { SettingsKey } from '@/settings/settings-keys.enum';
import type { OrchestratorSchedulingConfigJson, ResolvedOrchestratorSchedulingConfig } from './orchestrator-scheduling.types';
import { resolveOrchestratorSchedulingConfigOperation } from './resolve-orchestrator-scheduling-config.operation';
import { getDefaultIntervalSnapshotMs } from './get-default-interval-snapshot.operation';
import { resolvedSchedulingToPatchMinutes } from './resolved-scheduling-to-patch-minutes.operation';

/**
 * Resolves and persists unified orchestrator scheduling configuration per server.
 */
@Injectable()
export class OrchestratorSchedulingConfigService {
    private readonly logger = new Logger(OrchestratorSchedulingConfigService.name);

    constructor(private readonly settingsService: SettingsService) {}

    /**
     * Merged scheduling (defaults + JSON blob + legacy interval settings).
     */
    async resolveForServer(serverId: number): Promise<ResolvedOrchestratorSchedulingConfig> {
        return resolveOrchestratorSchedulingConfigOperation(serverId, {
            settingsService: this.settingsService,
            logger: this.logger,
        });
    }

    /**
     * Persists user-editable JSON patch (partial). Merged at read time with defaults and legacy keys.
     */
    async saveSchedulingJson(serverId: number, patch: OrchestratorSchedulingConfigJson): Promise<void> {
        await this.settingsService.setSetting(serverId, SettingsKey.ORCHESTRATOR_SCHEDULING_CONFIG, {
            value: patch,
        });
    }

    /**
     * Raw JSON blob as stored (partial), or null.
     */
    async getSchedulingJson(serverId: number): Promise<OrchestratorSchedulingConfigJson | null> {
        const row = await this.settingsService.getSetting<{ value: OrchestratorSchedulingConfigJson }>(
            serverId,
            SettingsKey.ORCHESTRATOR_SCHEDULING_CONFIG,
        );
        return row?.value ?? null;
    }

    /**
     * Initial-delay snapshot for UI (same as legacy default-intervals endpoint).
     */
    getDefaultIntervalSnapshotMs(): ReturnType<typeof getDefaultIntervalSnapshotMs> {
        return getDefaultIntervalSnapshotMs();
    }

    /**
     * Raw stored patch and effective scheduling as minutes (merged defaults + legacy keys).
     */
    async getSchedulingConfigForApi(serverId: number): Promise<{
        storedPatch: OrchestratorSchedulingConfigJson | null;
        effectivePatchMinutes: OrchestratorSchedulingConfigJson;
    }> {
        const storedPatch = await this.getSchedulingJson(serverId);
        const resolved = await this.resolveForServer(serverId);
        return {
            storedPatch,
            effectivePatchMinutes: resolvedSchedulingToPatchMinutes(resolved),
        };
    }
}
