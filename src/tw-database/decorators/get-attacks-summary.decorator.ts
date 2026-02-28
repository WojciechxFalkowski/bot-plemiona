import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';

/**
 * Swagger decorators for GET /api/tw-database/attacks/summary endpoint
 */
export function GetAttacksSummaryDecorators() {
    return applyDecorators(
        ApiOperation({
            summary: 'Pobiera podsumowanie ataków TW Database',
            description: 'Zwraca liczbę ataków wg statusu (pending/sent/failed) dla serwera',
        }),
        ApiQuery({
            name: 'serverId',
            required: true,
            type: Number,
            description: 'ID serwera (wymagany)',
        }),
        ApiResponse({
            status: 200,
            description: 'Liczby ataków wg statusu',
            schema: {
                type: 'object',
                properties: {
                    success: { type: 'boolean' },
                    data: {
                        type: 'object',
                        properties: {
                            pending: { type: 'number' },
                            sent: { type: 'number' },
                            failed: { type: 'number' },
                        },
                    },
                },
            },
        }),
        ApiResponse({
            status: 400,
            description: 'Nieprawidłowy serverId',
        }),
    );
}
