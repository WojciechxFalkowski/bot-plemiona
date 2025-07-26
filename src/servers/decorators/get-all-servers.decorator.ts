import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { ServerResponseDto } from '../dto';

export function GetAllServersDecorators() {
    return applyDecorators(
        ApiOperation({ 
            summary: 'Pobiera wszystkie serwery',
            description: 'Zwraca listę wszystkich serwerów z opcją uwzględnienia nieaktywnych'
        }),
        ApiQuery({
            name: 'includeInactive',
            required: false,
            type: Boolean,
            description: 'Czy uwzględnić nieaktywne serwery'
        }),
        ApiResponse({
            status: 200,
            description: 'Lista serwerów',
            type: [ServerResponseDto]
        })
    );
} 