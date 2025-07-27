import { ApiOperation, ApiParam, ApiBody, ApiResponse } from '@nestjs/swagger';

export const UpdateScavengingSettingDecorator = () => {
    return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
        ApiOperation({
            summary: 'Update scavenging setting for a server',
            description: 'Updates the AUTO_SCAVENGING_ENABLED setting and immediately refreshes task states'
        })(target, propertyKey, descriptor);

        ApiParam({
            name: 'serverId',
            description: 'Server ID',
            type: 'number',
            example: 217
        })(target, propertyKey, descriptor);

        ApiBody({
            schema: {
                type: 'object',
                properties: {
                    value: { type: 'boolean', example: true }
                },
                required: ['value']
            }
        })(target, propertyKey, descriptor);

        ApiResponse({
            status: 200,
            description: 'Scavenging setting updated successfully'
        })(target, propertyKey, descriptor);

        ApiResponse({
            status: 500,
            description: 'Internal server error during setting update'
        })(target, propertyKey, descriptor);

        return descriptor;
    };
}; 