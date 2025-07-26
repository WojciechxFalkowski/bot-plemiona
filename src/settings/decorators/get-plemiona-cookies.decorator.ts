import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';

export function GetPlemionaCookiesDecorators() {
    return applyDecorators(
        ApiOperation({
            summary: 'Get Plemiona cookies',
            description: 'Retrieves all Plemiona cookies needed for the bot to function'
        }),
        ApiResponse({
            status: 404,
            description: 'Cookies not found'
        })
    );
} 