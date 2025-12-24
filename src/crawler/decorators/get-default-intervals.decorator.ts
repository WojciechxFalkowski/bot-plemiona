import { ApiOperation, ApiResponse } from '@nestjs/swagger';

export const GetDefaultIntervalsDecorator = () => {
    return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
        ApiOperation({
            summary: 'Get default intervals',
            description: 'Returns the default intervals in milliseconds used when initializing server plans for all task types'
        })(target, propertyKey, descriptor);

        ApiResponse({
            status: 200,
            description: 'Default intervals retrieved successfully'
        })(target, propertyKey, descriptor);

        return descriptor;
    };
};

