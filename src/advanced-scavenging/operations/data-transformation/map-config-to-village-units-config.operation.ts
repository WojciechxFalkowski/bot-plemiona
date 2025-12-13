import { VillageUnitsConfig, ScavengingUnitsConfig } from '../../interfaces/scavenging-units-config.interface';

export interface MapConfigToVillageUnitsConfigParams {
  villageId: string;
  villageName: string;
  serverId: number;
  isAutoScavengingEnabled: boolean;
  units: ScavengingUnitsConfig;
}

/**
 * Mapuje dane wioski i konfigurację jednostek na obiekt VillageUnitsConfig
 * @param params Parametry zawierające dane wioski i konfigurację jednostek
 * @returns Konfiguracja jednostek dla wioski w formacie VillageUnitsConfig
 */
export function mapConfigToVillageUnitsConfigOperation(
  params: MapConfigToVillageUnitsConfigParams,
): VillageUnitsConfig {
  return {
    villageId: params.villageId,
    villageName: params.villageName,
    serverId: params.serverId,
    isAutoScavengingEnabled: params.isAutoScavengingEnabled,
    units: params.units,
  };
}


