import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';

export function GetSettingDecorators() {
    return applyDecorators(
        ApiOperation({
            summary: 'Get setting by key',
            description: 'Retrieves a setting value by its key'
        }),
        ApiParam({
            name: 'key',
            description: 'Setting key name from SettingsKey enum',
            example: 'CRAWLER_ORCHESTRATOR_ENABLED'
        }),
        ApiResponse({
            status: 200,
            description: 'Setting found and returned'
        }),
        ApiResponse({
            status: 404,
            description: 'Setting not found'
        })
    );
} 