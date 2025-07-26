import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { ServerCookiesResponseDto } from '../dto';

export function GetServerCookiesDecorators() {
    return applyDecorators(
        ApiOperation({ 
            summary: 'Pobiera cookies dla serwera',
            description: 'Zwraca dane cookies przechowywane dla serwera'
        }),
        ApiParam({ 
            name: 'id', 
            type: 'number', 
            description: 'ID serwera',
            example: 1
        }),
        ApiResponse({
            status: 200,
            description: 'Cookies serwera',
            type: ServerCookiesResponseDto
        }),
        ApiResponse({
            status: 404,
            description: 'Serwer nie został znaleziony lub nie ma cookies'
        })
    );
} 