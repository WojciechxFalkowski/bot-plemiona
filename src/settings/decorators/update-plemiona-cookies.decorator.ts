import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiBody, ApiResponse } from '@nestjs/swagger';
import { PlemionaCookiesDto } from '../dto';

export function UpdatePlemionaCookiesDecorators() {
    return applyDecorators(
        ApiOperation({
            summary: 'Update Plemiona cookies',
            description: 'Updates all Plemiona cookies needed for the bot to function. This will overwrite any existing cookies.'
        }),
        ApiBody({
            type: PlemionaCookiesDto,
            description: 'The cookies data for Plemiona login'
        }),
        ApiResponse({
            status: 200,
            description: 'Cookies updated successfully'
        }),
        ApiResponse({
            status: 400,
            description: 'Invalid cookie data format'
        })
    );
} 