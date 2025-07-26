import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ServerResponseDto } from '../dto';

export function CreateServerDecorators() {
    return applyDecorators(
        ApiOperation({ 
            summary: 'Tworzy nowy serwer',
            description: 'Dodaje nowy serwer do bazy danych'
        }),
        ApiResponse({
            status: 201,
            description: 'Serwer został utworzony',
            type: ServerResponseDto
        }),
        ApiResponse({
            status: 409,
            description: 'Serwer z tym kodem już istnieje'
        }),
        ApiResponse({
            status: 400,
            description: 'Nieprawidłowe dane wejściowe'
        })
    );
} 