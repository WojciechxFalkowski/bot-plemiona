import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';

export function DeleteServerDecorators() {
    return applyDecorators(
        ApiOperation({ 
            summary: 'Usuwa serwer',
            description: 'Usuwa serwer z bazy danych wraz z powiązanymi danymi'
        }),
        ApiParam({ 
            name: 'id', 
            type: 'number', 
            description: 'ID serwera',
            example: 1
        }),
        ApiResponse({
            status: 204,
            description: 'Serwer został usunięty'
        }),
        ApiResponse({
            status: 404,
            description: 'Serwer nie został znaleziony'
        })
    );
} 