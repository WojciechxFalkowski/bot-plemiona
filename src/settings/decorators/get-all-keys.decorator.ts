import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';

export function GetAllKeysDecorators() {
    return applyDecorators(
        ApiOperation({
            summary: 'Get all setting keys',
            description: 'Retrieves all available setting keys from the SettingsKey enum'
        }),
        ApiResponse({
            status: 200,
            description: 'List of all available setting keys returned successfully',
            schema: {
                type: 'object',
                properties: {
                    keys: {
                        type: 'array',
                        items: {
                            type: 'string'
                        },
                        example: [
                            'PLEMIONA_COOKIES',
                            'AUTO_SCAVENGING_ENABLED',
                            'AUTO_CONSTRUCTION_QUEUE_ENABLED',
                            'CRAWLER_ORCHESTRATOR_ENABLED'
                        ]
                    },
                    total: {
                        type: 'number',
                        example: 5
                    }
                }
            }
        })
    );
} 