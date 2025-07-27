import { ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';

export const TriggerScavengingDecorator = () => {
    return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
        ApiOperation({
            summary: 'Manually trigger scavenging process for a server',
            description: 'Manually starts the scavenging process for a specific server'
        })(target, propertyKey, descriptor);

        ApiParam({
            name: 'serverId',
            description: 'Server ID',
            type: 'number',
            example: 1
        })(target, propertyKey, descriptor);

        ApiResponse({
            status: 200,
            description: 'Scavenging process triggered successfully'
        })(target, propertyKey, descriptor);

        ApiResponse({
            status: 500,
            description: 'Internal server error during scavenging process'
        })(target, propertyKey, descriptor);

        return descriptor;
    };
}; 