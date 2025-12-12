import { Repository } from 'typeorm';
import { Logger } from '@nestjs/common';
import { VillagesService } from '@/villages/villages.service';
import { VillageScavengingUnitsConfigEntity } from '../../entities/village-scavenging-units-config.entity';
import { VillageUnitsConfig } from '../../interfaces/scavenging-units-config.interface';
import { createDefaultUnitsConfigOperation } from '../data-transformation/create-default-units-config.operation';
import { mapEntityToUnitsConfigOperation } from '../data-transformation/map-entity-to-units-config.operation';
import { mapConfigToVillageUnitsConfigOperation } from '../data-transformation/map-config-to-village-units-config.operation';

export interface GetVillageUnitsConfigDependencies {
  configRepository: Repository<VillageScavengingUnitsConfigEntity>;
  villagesService: VillagesService;
  logger: Logger;
}

/**
 * Pobiera konfigurację jednostek dla wioski
 * Jeśli konfiguracja nie istnieje, tworzy domyślną konfigurację
 * @param serverId ID serwera
 * @param villageId ID wioski
 * @param deps Zależności potrzebne do wykonania operacji
 * @returns Konfiguracja jednostek dla wioski
 */
export async function getVillageUnitsConfigOperation(
  serverId: number,
  villageId: string,
  deps: GetVillageUnitsConfigDependencies,
): Promise<VillageUnitsConfig> {
  const { configRepository, villagesService, logger } = deps;

  const village = await villagesService.findById(serverId, villageId);

  let config = await configRepository.findOne({
    where: { villageId, serverId },
  });

  if (!config) {
    logger.log(`Creating default units config for village ${villageId} on server ${serverId}`);
    const defaultUnits = createDefaultUnitsConfigOperation();
    
    config = configRepository.create({
      villageId,
      serverId,
      isScavengingSpearEnabled: defaultUnits.spear,
      isScavengingSwordEnabled: defaultUnits.sword,
      isScavengingAxeEnabled: defaultUnits.axe,
      isScavengingArcherEnabled: defaultUnits.archer,
      isScavengingLightEnabled: defaultUnits.light,
      isScavengingMarcherEnabled: defaultUnits.marcher,
      isScavengingHeavyEnabled: defaultUnits.heavy,
    });
    await configRepository.save(config);
  }

  const units = mapEntityToUnitsConfigOperation(config);

  return mapConfigToVillageUnitsConfigOperation({
    villageId: village.id,
    villageName: village.name,
    serverId: village.serverId,
    isAutoScavengingEnabled: village.isAutoScavengingEnabled,
    units,
  });
}

