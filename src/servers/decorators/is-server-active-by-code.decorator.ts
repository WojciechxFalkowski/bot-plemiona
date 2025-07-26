import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';

export function IsServerActiveByCodeDecorators() {
    return applyDecorators(
        ApiOperation({ 
            summary: 'Sprawdza czy serwer jest aktywny po kodzie',
            description: 'Zwraca true jeśli serwer o podanym kodzie istnieje i jest aktywny'
        }),
        ApiParam({ 
            name: 'serverCode', 
            type: 'string', 
            description: 'Kod serwera',
            example: 'pl216'
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