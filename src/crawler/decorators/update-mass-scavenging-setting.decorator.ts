import { ApiOperation, ApiParam, ApiBody, ApiResponse } from '@nestjs/swagger';

export const UpdateMassScavengingSettingDecorator = () => {
    return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
        ApiOperation({
            summary: 'Aktualizacja ustawienia masowego zbieractwa dla serwera',
            description: 'Ustawia AUTO_SCAVENGING_MASS_ENABLED i odświeża stany zadań harmonogramu'
        })(target, propertyKey, descriptor);

        ApiParam({
            name: 'serverId',
            description: 'Identyfikator serwera',
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
            description: 'Ustawienie masowego zbieractwa zaktualizowane'
        })(target, propertyKey, descriptor);

        ApiResponse({
            status: 500,
            description: 'Błąd serwera podczas aktualizacji ustawienia'
        })(target, propertyKey, descriptor);

        return descriptor;
    };
};
