import { applyDecorators } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { PutOrchestratorSchedulingConfigDto } from '../dto/put-orchestrator-scheduling-config.dto';

/**
 * Swagger decorators for PUT scheduling-config.
 */
export function PutOrchestratorSchedulingConfigDecorators() {
    return applyDecorators(
        ApiOperation({
            summary: 'Zapisuje częściową konfigurację harmonogramu orchestratora',
            description:
                'Zapisuje patch (minuty) w ustawieniach serwera i odświeża stany zadań. Puste pola pozostawiają domyślne wartości przy odczycie.',
        }),
        ApiParam({ name: 'serverId', description: 'Identyfikator serwera', type: Number, example: 1 }),
        ApiBody({ type: PutOrchestratorSchedulingConfigDto }),
        ApiResponse({
            status: 200,
            description: 'Konfiguracja zapisana',
        }),
        ApiResponse({ status: 500, description: 'Błąd serwera' }),
    );
}
