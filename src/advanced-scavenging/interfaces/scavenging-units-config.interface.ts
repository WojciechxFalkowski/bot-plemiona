import { ScavengingUnit } from '@/utils/scavenging.config';

/**
 * Konfiguracja włączonych jednostek dla zbieractwa
 */
export interface ScavengingUnitsConfig {
  spear: boolean;
  sword: boolean;
  axe: boolean;
  archer: boolean;
  light: boolean;
  marcher: boolean;
  heavy: boolean;
}

/**
 * Konfiguracja jednostek dla wioski
 */
export interface VillageUnitsConfig {
  villageId: string;
  villageName: string;
  serverId: number;
  isAutoScavengingEnabled: boolean;
  units: ScavengingUnitsConfig;
}

