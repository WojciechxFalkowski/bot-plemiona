import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';

export function DeleteServerCookiesDecorators() {
    return applyDecorators(
        ApiOperation({ 
            summary: 'Usuwa cookies dla serwera',
            description: 'Usuwa wszystkie dane cookies dla serwera'
        }),
        ApiParam({ 
            name: 'id', 
            type: 'number', 
            description: 'ID serwera',
            example: 1
        }),
        ApiResponse({
            status: 204,
            description: 'Cookies zostały usunięte'
        }),
        ApiResponse({
            status: 404,
            description: 'Serwer nie został znaleziony'
        })
    );
} 