import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiBody } from '@nestjs/swagger';

export function CreateSettingDecorators() {
    return applyDecorators(
        ApiOperation({
            summary: 'Create setting',
            description: 'Creates a new setting with the specified key and value'
        }),
        ApiParam({
            name: 'key',
            description: 'Setting key name from SettingsKey enum',
            example: 'CRAWLER_ORCHESTRATOR_ENABLED'
        }),
        ApiBody({
            description: 'The value to store for the setting. Value type depends on the setting key.',
            examples: {
                PLEMIONA_COOKIES: {
                    summary: 'Plemiona cookies array',
                    description: 'Array of cookie objects for Plemiona authentication',
                    value: [
                        {
                            name: 'pl_auth',
                            value: 'd10f35ddd864:c449c0dffdf525d354be8b618cb73de0e1c42b42f388623341cb5c2ae2bce504',
                            domain: '.plemiona.pl',
                            path: '/',
                            expires: 1714464392
                        },
                        {
                            name: 'cid',
                            value: '113995269',
                            domain: '.plemiona.pl',
                            path: '/',
                            expires: 1714464392
                        }
                    ]
                },
                AUTO_SCAVENGING_ENABLED: {
                    summary: 'Auto scavenging setting',
                    description: 'Object with enabled boolean property for auto scavenging',
                    value: { value: true }
                },
                AUTO_CONSTRUCTION_QUEUE_ENABLED: {
                    summary: 'Auto construction queue setting',
                    description: 'Object with enabled boolean property for auto construction queue',
                    value: { value: false }
                },
                CRAWLER_ORCHESTRATOR_ENABLED: {
                    summary: 'Crawler orchestrator setting',
                    description: 'Object with enabled boolean property for crawler orchestrator',
                    value: { value: true }
                }
            },
            schema: {
                oneOf: [
                    { type: 'string', example: '12345' },
                    { type: 'number', example: 12345 },
                    { type: 'boolean', example: true },
                    {
                        type: 'object',
                        example: { value: true }
                    },
                    {
                        type: 'array',
                        example: [
                            {
                                name: 'pl_auth',
                                value: 'cookie_value',
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
            status: 201,
            description: 'Setting created successfully'
        }),
        ApiResponse({
            status: 400,
            description: 'Invalid input data'
        })
    );
} 