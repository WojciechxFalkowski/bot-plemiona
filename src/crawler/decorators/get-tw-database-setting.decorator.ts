import { ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';

export const GetTwDatabaseSettingDecorator = () => {
    return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
        ApiOperation({
            summary: 'Pobiera ustawienia TW Database dla serwera',
            description: 'Zwraca enabled, login i hasło (odszyfrowane dla formularza)'
        })(target, propertyKey, descriptor);

        ApiParam({
            name: 'serverId',
            description: 'ID serwera',
            type: 'number',
            example: 217
        })(target, propertyKey, descriptor);

        ApiResponse({
            status: 200,
            description: 'Ustawienia TW Database'
        })(target, propertyKey, descriptor);

        return descriptor;
    };
};
