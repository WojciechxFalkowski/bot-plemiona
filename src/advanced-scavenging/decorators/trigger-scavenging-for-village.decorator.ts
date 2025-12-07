import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';

export function TriggerScavengingForVillageDecorators() {
  return applyDecorators(
    ApiOperation({
      summary: 'Ręcznie wyzwala zbieractwo dla konkretnej wioski',
      description: 'Wysyła jednostki na zbieractwo dla wybranej wioski zgodnie z konfiguracją jednostek i limitami',
    }),
    ApiParam({
      name: 'serverId',
      description: 'ID serwera',
      type: 'number',
      example: 221,
    }),
    ApiParam({
      name: 'villageId',
      description: 'ID wioski',
      type: 'string',
      example: '13177',
    }),
    ApiResponse({
      status: 200,
      description: 'Zbieractwo zostało uruchomione pomyślnie',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Successfully dispatched 2 scavenging missions from village 0001' },
          dispatchedCount: { type: 'number', example: 2 },
        },
      },
    }),
    ApiResponse({
      status: 400,
      description: 'Błąd walidacji - wioska nie istnieje lub zbieractwo jest wyłączone',
    }),
    ApiResponse({
      status: 500,
      description: 'Błąd serwera podczas wykonywania zbieractwa',
    }),
  );
}

