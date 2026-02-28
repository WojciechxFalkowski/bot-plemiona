import { ApiOperation, ApiParam, ApiBody, ApiResponse } from '@nestjs/swagger';

export const UpdateTwDatabaseSettingDecorator = () => {
    return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
        ApiOperation({
            summary: 'Aktualizuje ustawienia TW Database dla serwera',
            description:
                'Aktualizuje enabled, login i hasło. Hasło jest szyfrowane przed zapisem. Dane credentials są zachowywane także gdy enabled=false.'
        })(target, propertyKey, descriptor);

        ApiParam({
            name: 'serverId',
            description: 'ID serwera',
            type: 'number',
            example: 217
        })(target, propertyKey, descriptor);

        ApiBody({
            schema: {
                type: 'object',
                properties: {
                    value: { type: 'boolean', example: true, description: 'Czy integracja TW Database jest włączona' },
                    login: { type: 'string', example: 'user', description: 'Login do twdatabase.online' },
                    password: { type: 'string', example: 'secret', description: 'Hasło (plain, będzie zaszyfrowane)' }
                }
            }
        })(target, propertyKey, descriptor);

        ApiResponse({
            status: 200,
            description: 'Ustawienia TW Database zaktualizowane pomyślnie'
        })(target, propertyKey, descriptor);

        ApiResponse({
            status: 500,
            description: 'Błąd serwera podczas aktualizacji'
        })(target, propertyKey, descriptor);

        return descriptor;
    };
};
