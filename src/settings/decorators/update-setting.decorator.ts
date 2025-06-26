import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiBody } from '@nestjs/swagger';

export function UpdateSettingDecorators() {
    return applyDecorators(
        ApiOperation({
            summary: 'Update setting',
            description: 'Updates an existing setting with the specified key'
        }),
        ApiParam({
            name: 'key',
            description: 'Setting key name from SettingsKey enum',
            example: 'CRAWLER_ORCHESTRATOR_ENABLED'
        }),
        ApiBody({
            description: 'The new value to store for the setting. Value type depends on the setting key.',
            examples: {
                PLEMIONA_COOKIES: {
                    summary: 'Update Plemiona cookies',
                    description: 'Updated array of cookie objects for Plemiona authentication',
                    value: [
                        {
                            name: 'pl_auth',
                            value: 'updated_auth_token:new_hash_value_here',
                            domain: '.plemiona.pl',
                            path: '/',
                            expires: 1714464392
                        },
                        {
                            name: 'sid',
                            value: 'updated_session_id_value',
                            domain: 'pl216.plemiona.pl',
                            path: '/',
                            expires: -1
                        }
                    ]
                },
                AUTO_SCAVENGING_ENABLED: {
                    summary: 'Update auto scavenging setting',
                    description: 'Updated object with enabled boolean property for auto scavenging',
                    value: { value: false }
                },
                AUTO_CONSTRUCTION_QUEUE_ENABLED: {
                    summary: 'Update auto construction queue setting',
                    description: 'Updated object with enabled boolean property for auto construction queue',
                    value: { value: true }
                },
                CRAWLER_ORCHESTRATOR_ENABLED: {
                    summary: 'Update crawler orchestrator setting',
                    description: 'Updated object with enabled boolean property for crawler orchestrator',
                    value: { value: false }
                }
            },
            schema: {
                oneOf: [
                    { type: 'string', example: '67890' },
                    { type: 'number', example: 67890 },
                    { type: 'boolean', example: false },
                    {
                        type: 'object',
                        example: { value: false }
                    },
                    {
                        type: 'array',
                        example: [
                            {
                                name: 'pl_auth',
                                value: 'updated_cookie_value',
                                domain: '.plemiona.pl',
                                path: '/',
                                expires: 1714464392
                            }
                        ]
                    }
                ]
            }
        }),
        ApiResponse({
            status: 200,
            description: 'Setting updated successfully'
        }),
        ApiResponse({
            status: 400,
            description: 'Invalid input data or key'
        }),
        ApiResponse({
            status: 404,
            description: 'Setting not found'
        })
    );
} 