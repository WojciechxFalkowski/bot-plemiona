import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiBody, ApiResponse } from '@nestjs/swagger';
import { PlemionaCookiesDto } from '../dto';

export function SetPlemionaCookiesDecorators() {
    return applyDecorators(
        ApiOperation({
            summary: 'Set Plemiona cookies',
            description: 'Sets all Plemiona cookies needed for the bot to function. This will overwrite any existing cookies.'
        }),
        ApiBody({
            type: PlemionaCookiesDto,
            description: 'The cookies data for Plemiona login'
        }),
        ApiResponse({
            status: 201,
            description: 'Cookies saved successfully'
        }),
        ApiResponse({
            status: 400,
            description: 'Invalid cookie data format'
        })
    );
} 