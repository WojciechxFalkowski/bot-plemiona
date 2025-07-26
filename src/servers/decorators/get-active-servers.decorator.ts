import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ServerResponseDto } from '../dto';

export function GetActiveServersDecorators() {
    return applyDecorators(
        ApiOperation({ 
            summary: 'Pobiera tylko aktywne serwery',
            description: 'Zwraca listę serwerów z isActive = true'
        }),
        ApiResponse({
            status: 200,
            description: 'Lista aktywnych serwerów',
            type: [ServerResponseDto]
        })
    );
} 