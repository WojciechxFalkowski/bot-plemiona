import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { ServerCookiesResponseDto } from '../dto';

export function UpdateServerCookiesDecorators() {
    return applyDecorators(
        ApiOperation({ 
            summary: 'Aktualizuje cookies dla serwera',
            description: 'Ustawia lub aktualizuje dane cookies dla serwera'
        }),
        ApiParam({ 
            name: 'id', 
            type: 'number', 
            description: 'ID serwera',
            example: 1
        }),
        ApiResponse({
            status: 200,
            description: 'Cookies zostały zaktualizowane',
            type: ServerCookiesResponseDto
        }),
        ApiResponse({
            status: 404,
            description: 'Serwer nie został znaleziony'
        })
    );
} 