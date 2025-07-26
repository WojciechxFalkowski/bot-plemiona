import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { ServerResponseDto } from '../dto';

export function GetServerByIdDecorators() {
    return applyDecorators(
        ApiOperation({ 
            summary: 'Pobiera serwer po ID',
            description: 'Zwraca szczegóły serwera o podanym ID wraz z cookies'
        }),
        ApiParam({ 
            name: 'id', 
            type: 'number', 
            description: 'ID serwera',
            example: 1
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