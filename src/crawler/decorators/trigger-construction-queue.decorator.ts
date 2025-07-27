import { ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';

export const TriggerConstructionQueueDecorator = () => {
    return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
        ApiOperation({
            summary: 'Manually trigger construction queue processing for a server',
            description: 'Manually starts the construction queue processing for a specific server'
        })(target, propertyKey, descriptor);

        ApiParam({
            name: 'serverId',
            description: 'Server ID',
            type: 'number',
            example: 1
        })(target, propertyKey, descriptor);

        ApiResponse({
            status: 200,
            description: 'Construction queue processing triggered successfully'
        })(target, propertyKey, descriptor);

        ApiResponse({
            status: 500,
            description: 'Internal server error during construction queue processing'
        })(target, propertyKey, descriptor);

        return descriptor;
    };
}; 