import { ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';

export const TriggerTwDatabaseDecorator = () => {
    return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
        ApiOperation({
            summary: 'Ręczne wyzwolenie TW Database dla serwera',
            description: 'Wykonuje od razu wizytę Attack Planner i wysyłanie ataków dla podanego serwera'
        })(target, propertyKey, descriptor);

        ApiParam({
            name: 'serverId',
            description: 'ID serwera',
            type: 'number',
            example: 217
        })(target, propertyKey, descriptor);

        ApiResponse({
            status: 200,
            description: 'TW Database wykonane pomyślnie'
        })(target, propertyKey, descriptor);

        ApiResponse({
            status: 500,
            description: 'Błąd serwera podczas wykonania TW Database'
        })(target, propertyKey, descriptor);

        return descriptor;
    };
};
