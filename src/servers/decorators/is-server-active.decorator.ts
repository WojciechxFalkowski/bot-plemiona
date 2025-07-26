import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';

export function IsServerActiveDecorators() {
    return applyDecorators(
        ApiOperation({ 
            summary: 'Sprawdza czy serwer jest aktywny',
            description: 'Zwraca true jeśli serwer istnieje i jest aktywny'
        }),
        ApiParam({ 
            name: 'id', 
            type: 'number', 
            description: 'ID serwera',
            example: 1
        }),
        ApiResponse({
            status: 200,
            description: 'Status aktywności serwera',
            schema: { 
                type: 'boolean',
                example: true
            }
        })
    );
} 