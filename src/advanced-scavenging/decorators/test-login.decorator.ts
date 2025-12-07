import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';

export function TestLoginDecorators() {
  return applyDecorators(
    ApiOperation({
      summary: 'Testowy endpoint do logowania - otwiera przeglądarkę z headless: false',
      description: 'Używane do testowania w Postmanie. Otwiera widoczną przeglądarkę i loguje się do gry. Przeglądarka pozostaje otwarta do ręcznego sprawdzenia.',
    }),
    ApiParam({ name: 'serverId', description: 'ID serwera' }),
    ApiResponse({
      status: 200,
      description: 'Wynik logowania',
      schema: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          message: { type: 'string' },
          url: { type: 'string', nullable: true },
        },
      },
    }),
  );
}

