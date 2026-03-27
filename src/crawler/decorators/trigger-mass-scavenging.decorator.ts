import { ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';

export const TriggerMassScavengingDecorator = () => {
    return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
        ApiOperation({
            summary: 'Ręczne uruchomienie masowego zbieractwa dla serwera',
            description:
                'Uruchamia zadanie masowego zbieractwa (scavenge_mass) dla wskazanego serwera, jeśli włączone jest AUTO_SCAVENGING_MASS_ENABLED'
        })(target, propertyKey, descriptor);

        ApiParam({
            name: 'serverId',
            description: 'Identyfikator serwera',
            type: 'number',
            example: 1
        })(target, propertyKey, descriptor);

        ApiResponse({
            status: 200,
            description: 'Zadanie masowego zbieractwa uruchomione lub pominięte (wyłączone w ustawieniach)'
        })(target, propertyKey, descriptor);

        ApiResponse({
            status: 500,
            description: 'Błąd serwera podczas uruchamiania masowego zbieractwa'
        })(target, propertyKey, descriptor);

        return descriptor;
    };
};
