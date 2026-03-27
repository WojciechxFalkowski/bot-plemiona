import { BadRequestException, Logger } from '@nestjs/common';
import { In, Repository } from 'typeorm';
import { VillagesService } from '@/villages/villages.service';
import { VillageScavengingUnitsConfigEntity } from '../../entities/village-scavenging-units-config.entity';
import { createDefaultUnitsConfigOperation } from '../data-transformation/create-default-units-config.operation';
import { mapEntityToUnitsConfigOperation } from '../data-transformation/map-entity-to-units-config.operation';
import { validateAtLeastOneUnitEnabledOperation } from '../validation/validate-at-least-one-unit-enabled.operation';
import { runWithConcurrencyLimit } from '../../utils/run-with-concurrency-limit';

/** Max concurrent per-village prepare+validate steps (I/O-free); single transaction persists all. */
const BATCH_PREPARE_CONCURRENCY = 8;

export type BatchUnitsPatch = {
  spear?: boolean;
  sword?: boolean;
  axe?: boolean;
  archer?: boolean;
  light?: boolean;
  marcher?: boolean;
  heavy?: boolean;
};

export interface BatchUpdateUnitsConfigDependencies {
  configRepository: Repository<VillageScavengingUnitsConfigEntity>;
  villagesService: VillagesService;
  logger: Logger;
}

function applyPartialUnitsPatchToEntity(
  config: VillageScavengingUnitsConfigEntity,
  units: BatchUnitsPatch,
): void {
  if (units.spear !== undefined) {
    config.isScavengingSpearEnabled = units.spear;
  }
  if (units.sword !== undefined) {
    config.isScavengingSwordEnabled = units.sword;
  }
  if (units.axe !== undefined) {
    config.isScavengingAxeEnabled = units.axe;
  }
  if (units.archer !== undefined) {
    config.isScavengingArcherEnabled = units.archer;
  }
  if (units.light !== undefined) {
    config.isScavengingLightEnabled = units.light;
  }
  if (units.marcher !== undefined) {
    config.isScavengingMarcherEnabled = units.marcher;
  }
  if (units.heavy !== undefined) {
    config.isScavengingHeavyEnabled = units.heavy;
  }
}

/**
 * Applies the same partial unit patch to every auto-scavenging village on the server.
 * Loads configs in bulk, validates per village, persists in one transaction.
 */
export async function batchUpdateUnitsConfigOperation(
  serverId: number,
  units: BatchUnitsPatch,
  deps: BatchUpdateUnitsConfigDependencies,
): Promise<{ updatedCount: number; skippedCount: number }> {
  const { configRepository, villagesService, logger } = deps;
  const villages = await villagesService.findAll(serverId, false);
  const enabledVillages = villages.filter((v) => v.isAutoScavengingEnabled);
  if (enabledVillages.length === 0) {
    logger.log(`Batch update for server ${serverId}: 0 villages with auto-scavenging`);
    return { updatedCount: 0, skippedCount: 0 };
  }
  const villageIds = enabledVillages.map((v) => v.id);
  const existingRows = await configRepository.find({
    where: { serverId, villageId: In(villageIds) },
  });
  const byVillageId = new Map(existingRows.map((row) => [row.villageId, row]));
  const prepareResults = await runWithConcurrencyLimit(
    enabledVillages,
    BATCH_PREPARE_CONCURRENCY,
    async (village) => {
      let config = byVillageId.get(village.id);
      if (!config) {
        const defaults = createDefaultUnitsConfigOperation();
        config = configRepository.create({
          villageId: village.id,
          serverId,
          isScavengingSpearEnabled: defaults.spear,
          isScavengingSwordEnabled: defaults.sword,
          isScavengingAxeEnabled: defaults.axe,
          isScavengingArcherEnabled: defaults.archer,
          isScavengingLightEnabled: defaults.light,
          isScavengingMarcherEnabled: defaults.marcher,
          isScavengingHeavyEnabled: defaults.heavy,
        });
      }
      applyPartialUnitsPatchToEntity(config, units);
      try {
        validateAtLeastOneUnitEnabledOperation(mapEntityToUnitsConfigOperation(config));
      } catch (err) {
        if (err instanceof BadRequestException) {
          return { ok: false as const };
        }
        throw err;
      }
      return { ok: true as const, entity: config };
    },
  );
  const toSave: VillageScavengingUnitsConfigEntity[] = [];
  let skippedCount = 0;
  for (const r of prepareResults) {
    if (r.ok) {
      toSave.push(r.entity);
    } else {
      skippedCount++;
    }
  }
  if (toSave.length > 0) {
    await configRepository.manager.transaction(async (manager) => {
      await manager.save(VillageScavengingUnitsConfigEntity, toSave);
    });
  }
  const updatedCount = toSave.length;
  logger.log(`Batch update for server ${serverId}: ${updatedCount} updated, ${skippedCount} skipped`);
  return { updatedCount, skippedCount };
}
