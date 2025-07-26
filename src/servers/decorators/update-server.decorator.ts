import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { ServerResponseDto } from '../dto';

export function UpdateServerDecorators() {
    return applyDecorators(
        ApiOperation({ 
            summary: 'Aktualizuje serwer',
            description: 'Modyfikuje dane istniejącego serwera'
        }),
        ApiParam({ 
            name: 'id', 
            type: 'number', 
            description: 'ID serwera',
            example: 1
        }),
        ApiResponse({
            status: 200,
            description: 'Serwer został zaktualizowany',
            type: ServerResponseDto
        }),
        ApiResponse({
            status: 404,
            description: 'Serwer nie został znaleziony'
        }),
        ApiResponse({
            status: 409,
            description: 'Serwer z nowym kodem już istnieje'
        })
    );
} 