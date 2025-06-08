import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';

export function DeletePlemionaCookiesDecorators() {
    return applyDecorators(
        ApiOperation({
            summary: 'Delete Plemiona cookies',
            description: 'Deletes all Plemiona cookies. The bot will fall back to manual login.'
        }),
        ApiResponse({
            status: 200,
            description: 'Cookies deleted successfully'
        })
    );
} 