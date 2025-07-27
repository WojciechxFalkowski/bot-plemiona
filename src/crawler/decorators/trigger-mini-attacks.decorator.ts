import { ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';

export const TriggerMiniAttacksDecorator = () => {
    return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
        ApiOperation({
            summary: 'Manually trigger mini attacks for a server',
            description: 'Manually starts the mini attacks process for a specific server'
        })(target, propertyKey, descriptor);

        ApiParam({
            name: 'serverId',
            description: 'Server ID',
            type: 'number',
            example: 1
        })(target, propertyKey, descriptor);

        ApiResponse({
            status: 200,
            description: 'Mini attacks triggered successfully'
        })(target, propertyKey, descriptor);

        ApiResponse({
            status: 500,
            description: 'Internal server error during mini attacks'
        })(target, propertyKey, descriptor);

        return descriptor;
    };
}; 