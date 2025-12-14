import { VillageScavengingUnitsConfigEntity } from '../../entities/village-scavenging-units-config.entity';
import { ScavengingUnitsConfig } from '../../interfaces/scavenging-units-config.interface';

/**
 * Mapuje encję konfiguracji jednostek na obiekt ScavengingUnitsConfig
 * @param config Encja konfiguracji jednostek z bazy danych
 * @returns Konfiguracja jednostek w formacie ScavengingUnitsConfig
 */
export function mapEntityToUnitsConfigOperation(
  config: VillageScavengingUnitsConfigEntity,
): ScavengingUnitsConfig {
  return {
    spear: config.isScavengingSpearEnabled,
    sword: config.isScavengingSwordEnabled,
    axe: config.isScavengingAxeEnabled,
    archer: config.isScavengingArcherEnabled,
    light: config.isScavengingLightEnabled,
    marcher: config.isScavengingMarcherEnabled,
    heavy: config.isScavengingHeavyEnabled,
  };
}



