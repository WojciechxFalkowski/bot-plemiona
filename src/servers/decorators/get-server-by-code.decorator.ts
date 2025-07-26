import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { ServerResponseDto } from '../dto';

export function GetServerByCodeDecorators() {
    return applyDecorators(
        ApiOperation({ 
            summary: 'Pobiera serwer po kodzie',
            description: 'Zwraca szczegóły serwera o podanym kodzie (np. pl216)'
        }),
        ApiParam({ 
            name: 'serverCode', 
            type: 'string', 
            description: 'Kod serwera (np. pl216)',
            example: 'pl216'
        }),
        ApiResponse({
            status: 200,
            description: 'Serwer znaleziony',
            type: ServerResponseDto
        }),
        ApiResponse({
            status: 404,
            description: 'Serwer nie został znaleziony'
        })
    );
} 