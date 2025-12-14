import { ScavengingUnitsConfig } from '../../interfaces/scavenging-units-config.interface';

/**
 * Tworzy domyślną konfigurację jednostek dla zbieractwa
 * Domyślnie włączony jest tylko pikinier (spear), pozostałe jednostki są wyłączone
 * @returns Domyślna konfiguracja jednostek
 */
export function createDefaultUnitsConfigOperation(): ScavengingUnitsConfig {
  return {
    spear: true,
    sword: false,
    axe: false,
    archer: false,
    light: false,
    marcher: false,
    heavy: false,
  };
}



