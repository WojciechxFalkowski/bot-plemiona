import { ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';

export const TriggerArmyTrainingDecorator = () => {
    return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
        ApiOperation({
            summary: 'Manually trigger army training for a server',
            description: 'Executes army training immediately for the specified server'
        })(target, propertyKey, descriptor);

        ApiParam({
            name: 'serverId',
            description: 'Server ID',
            type: 'number',
            example: 217
        })(target, propertyKey, descriptor);

        ApiResponse({
            status: 200,
            description: 'Army training completed successfully'
        })(target, propertyKey, descriptor);

        ApiResponse({
            status: 500,
            description: 'Internal server error during army training execution'
        })(target, propertyKey, descriptor);

        return descriptor;
    };
}; 