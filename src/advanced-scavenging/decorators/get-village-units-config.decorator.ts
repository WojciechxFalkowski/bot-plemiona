import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { VillageUnitsConfigDto } from '../dto/village-units-config.dto';

export function GetVillageUnitsConfigDecorators() {
  return applyDecorators(
    ApiOperation({ summary: 'Pobierz konfigurację jednostek dla wioski' }),
    ApiParam({ name: 'serverId', description: 'ID serwera' }),
    ApiParam({ name: 'villageId', description: 'ID wioski' }),
    ApiResponse({ status: 200, description: 'Konfiguracja jednostek', type: VillageUnitsConfigDto }),
    ApiResponse({ status: 404, description: 'Wioska nie została znaleziona' }),
  );
}

