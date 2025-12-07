import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { VillageUnitsConfigDto } from '../dto/village-units-config.dto';

export function UpdateVillageUnitsConfigDecorators() {
  return applyDecorators(
    ApiOperation({ summary: 'Zaktualizuj konfigurację jednostek dla wioski' }),
    ApiParam({ name: 'serverId', description: 'ID serwera' }),
    ApiParam({ name: 'villageId', description: 'ID wioski' }),
    ApiResponse({ status: 200, description: 'Konfiguracja zaktualizowana', type: VillageUnitsConfigDto }),
    ApiResponse({ status: 400, description: 'Nieprawidłowe dane lub wszystkie jednostki wyłączone' }),
    ApiResponse({ status: 404, description: 'Wioska nie została znaleziona' }),
  );
}

