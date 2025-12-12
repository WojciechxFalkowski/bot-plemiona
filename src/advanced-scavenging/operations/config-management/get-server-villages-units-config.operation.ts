import { Repository } from 'typeorm';
import { Logger } from '@nestjs/common';
import { VillagesService } from '@/villages/villages.service';
import { VillageScavengingUnitsConfigEntity } from '../../entities/village-scavenging-units-config.entity';
import { VillageUnitsConfig, ScavengingUnitsConfig } from '../../interfaces/scavenging-units-config.interface';
import { createDefaultUnitsConfigOperation } from '../data-transformation/create-default-units-config.operation';
import { mapEntityToUnitsConfigOperation } from '../data-transformation/map-entity-to-units-config.operation';
import { mapConfigToVillageUnitsConfigOperation } from '../data-transformation/map-config-to-village-units-config.operation';

export interface GetServerVillagesUnitsConfigDependencies {
  configRepository: Repository<VillageScavengingUnitsConfigEntity>;
  villagesService: VillagesService;
  logger: Logger;
}

/**
 * Pobiera konfigurację jednostek dla wszystkich wiosek serwera
 * Zwraca tylko wioski z włączonym automatycznym zbieractwem (isAutoScavengingEnabled === true)
 * @param serverId ID serwera
 * @param deps Zależności potrzebne do wykonania operacji
 * @returns Lista konfiguracji jednostek dla wiosek serwera
 */
export async function getServerVillagesUnitsConfigOperation(
  serverId: number,
  deps: GetServerVillagesUnitsConfigDependencies,
): Promise<VillageUnitsConfig[]> {
  const { configRepository, villagesService, logger } = deps;

  const villages = await villagesService.findAll(serverId, false);

  const enabledVillages = villages.filter(village => village.isAutoScavengingEnabled);

  const configs = await configRepository
    .createQueryBuilder('config')
    .where('config.serverId = :serverId', { serverId })
    .getMany();

  const configMap = new Map(configs.map(c => [c.villageId, c]));

  return enabledVillages.map(village => {
    const config = configMap.get(village.id);
    
    const units: ScavengingUnitsConfig = config 
      ? mapEntityToUnitsConfigOperation(config)
      : createDefaultUnitsConfigOperation();

    return mapConfigToVillageUnitsConfigOperation({
      villageId: village.id,
      villageName: village.name,
      serverId: village.serverId,
      isAutoScavengingEnabled: village.isAutoScavengingEnabled,
      units,
    });
  });
}

