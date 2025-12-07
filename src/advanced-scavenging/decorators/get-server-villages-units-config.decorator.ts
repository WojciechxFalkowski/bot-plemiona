import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { VillageUnitsConfigDto } from '../dto/village-units-config.dto';

export function GetServerVillagesUnitsConfigDecorators() {
  return applyDecorators(
    ApiOperation({ summary: 'Pobierz konfigurację jednostek dla wszystkich wiosek serwera' }),
    ApiParam({ name: 'serverId', description: 'ID serwera' }),
    ApiResponse({ status: 200, description: 'Lista konfiguracji wiosek', type: [VillageUnitsConfigDto] }),
  );
}

