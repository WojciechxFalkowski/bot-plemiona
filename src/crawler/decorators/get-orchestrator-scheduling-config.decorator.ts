import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';

/**
 * Swagger decorators for GET scheduling-config.
 */
export function GetOrchestratorSchedulingConfigDecorators() {
    return applyDecorators(
        ApiOperation({
            summary: 'Pobiera konfigurację harmonogramu orchestratora',
            description:
                'Zwraca zapisany fragment JSON (patch) oraz efektywne wartości w minutach po scaleniu z domyślnymi i legacy ustawieniami interwałów.',
        }),
        ApiParam({ name: 'serverId', description: 'Identyfikator serwera', type: Number, example: 1 }),
        ApiResponse({
            status: 200,
            description: 'Konfiguracja harmonogramu',
        }),
        ApiResponse({ status: 500, description: 'Błąd serwera' }),
    );
}
