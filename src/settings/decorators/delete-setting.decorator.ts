import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';

export function DeleteSettingDecorators() {
    return applyDecorators(
        ApiOperation({
            summary: 'Delete setting',
            description: 'Deletes a setting with the specified key'
        }),
        ApiParam({
            name: 'key',
            description: 'Setting key name from SettingsKey enum',
            example: 'CRAWLER_ORCHESTRATOR_ENABLED'
        }),
        ApiResponse({
            status: 200,
            description: 'Setting deleted successfully'
        }),
        ApiResponse({
            status: 404,
            description: 'Setting not found'
        })
    );
} 