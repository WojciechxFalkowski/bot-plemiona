import { ApiOperation, ApiResponse } from '@nestjs/swagger';

export const GetStatusDecorator = () => {
    return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
        ApiOperation({
            summary: 'Get multi-server orchestrator status',
            description: 'Returns the current status of all servers in the multi-server orchestrator'
        })(target, propertyKey, descriptor);

        ApiResponse({
            status: 200,
            description: 'Multi-server orchestrator status retrieved successfully'
        })(target, propertyKey, descriptor);

        return descriptor;
    };
}; 