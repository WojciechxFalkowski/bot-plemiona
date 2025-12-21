import { Repository } from 'typeorm';
import { Logger } from '@nestjs/common';
import { VillagesService } from '@/villages/villages.service';
import { VillageScavengingUnitsConfigEntity } from '../../entities/village-scavenging-units-config.entity';
import { UpdateVillageUnitsConfigDto } from '../../dto/update-village-units-config.dto';
import { VillageUnitsConfig, ScavengingUnitsConfig } from '../../interfaces/scavenging-units-config.interface';
import { createDefaultUnitsConfigOperation } from '../data-transformation/create-default-units-config.operation';
import { mapEntityToUnitsConfigOperation } from '../data-transformation/map-entity-to-units-config.operation';
import { mapConfigToVillageUnitsConfigOperation } from '../data-transformation/map-config-to-village-units-config.operation';
import { validateAtLeastOneUnitEnabledOperation } from '../validation/validate-at-least-one-unit-enabled.operation';

export interface UpdateVillageUnitsConfigDependencies {
  configRepository: Repository<VillageScavengingUnitsConfigEntity>;
  villagesService: VillagesService;
  logger: Logger;
}

/**
 * Aktualizuje konfigurację jednostek dla wioski
 * Jeśli konfiguracja nie istnieje, tworzy nową z domyślnymi wartościami
 * @param serverId ID serwera
 * @param villageId ID wioski
 * @param updateDto DTO z aktualizacjami konfiguracji
 * @param deps Zależności potrzebne do wykonania operacji
 * @returns Zaktualizowana konfiguracja jednostek dla wioski
 */
export async function updateVillageUnitsConfigOperation(
  serverId: number,
  villageId: string,
  updateDto: UpdateVillageUnitsConfigDto,
  deps: UpdateVillageUnitsConfigDependencies,
): Promise<VillageUnitsConfig> {
  const { configRepository, villagesService, logger } = deps;

  const village = await villagesService.findById(serverId, villageId);

  let config = await configRepository.findOne({
    where: { villageId },
  });

  if (!config) {
    logger.log(`Creating new units config for village ${villageId} on server ${serverId}`);
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
  }

  if (updateDto.units) {
    if (updateDto.units.spear !== undefined) {
      config.isScavengingSpearEnabled = updateDto.units.spear;
    }
    if (updateDto.units.sword !== undefined) {
      config.isScavengingSwordEnabled = updateDto.units.sword;
    }
    if (updateDto.units.axe !== undefined) {
      config.isScavengingAxeEnabled = updateDto.units.axe;
    }
    if (updateDto.units.archer !== undefined) {
      config.isScavengingArcherEnabled = updateDto.units.archer;
    }
    if (updateDto.units.light !== undefined) {
      config.isScavengingLightEnabled = updateDto.units.light;
    }
    if (updateDto.units.marcher !== undefined) {
      config.isScavengingMarcherEnabled = updateDto.units.marcher;
    }
    if (updateDto.units.heavy !== undefined) {
      config.isScavengingHeavyEnabled = updateDto.units.heavy;
    }
  }

  const updatedUnits: ScavengingUnitsConfig = {
    spear: config.isScavengingSpearEnabled,
    sword: config.isScavengingSwordEnabled,
    axe: config.isScavengingAxeEnabled,
    archer: config.isScavengingArcherEnabled,
    light: config.isScavengingLightEnabled,
    marcher: config.isScavengingMarcherEnabled,
    heavy: config.isScavengingHeavyEnabled,
  };

  validateAtLeastOneUnitEnabledOperation(updatedUnits);

  await configRepository.save(config);

  const refreshedConfig = await configRepository.findOne({
    where: { villageId },
  });

  if (refreshedConfig) {
    const refreshedUnits = mapEntityToUnitsConfigOperation(refreshedConfig);
    
    return mapConfigToVillageUnitsConfigOperation({
      villageId: village.id,
      villageName: village.name,
      serverId: village.serverId,
      isAutoScavengingEnabled: village.isAutoScavengingEnabled,
      units: refreshedUnits,
    });
  }

  return mapConfigToVillageUnitsConfigOperation({
    villageId: village.id,
    villageName: village.name,
    serverId: village.serverId,
    isAutoScavengingEnabled: village.isAutoScavengingEnabled,
    units: updatedUnits,
  });
}




