import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';

export function GetAllSettingsForServerDecorators() {
    return applyDecorators(
        ApiOperation({
            summary: 'Get all settings for server',
            description: 'Retrieves all settings for a specific server'
        }),
        ApiParam({
            name: 'serverId',
            description: 'Server ID',
            type: 'number',
            example: 1
        }),
        ApiResponse({
            status: 200,
            description: 'Settings found and returned'
        }),
        ApiResponse({
            status: 404,
            description: 'Server not found'
        })
    );
} 