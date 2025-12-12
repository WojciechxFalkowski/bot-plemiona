import { BadRequestException } from '@nestjs/common';
import { ScavengingUnitsConfig } from '../../interfaces/scavenging-units-config.interface';

/**
 * Waliduje, że przynajmniej jedna jednostka jest włączona w konfiguracji
 * @param units Konfiguracja jednostek do walidacji
 * @throws BadRequestException jeśli żadna jednostka nie jest włączona
 */
export function validateAtLeastOneUnitEnabledOperation(
  units: ScavengingUnitsConfig,
): void {
  const hasAnyEnabled = Object.values(units).some(enabled => enabled === true);
  
  if (!hasAnyEnabled) {
    throw new BadRequestException('At least one unit type must be enabled for scavenging');
  }
}

