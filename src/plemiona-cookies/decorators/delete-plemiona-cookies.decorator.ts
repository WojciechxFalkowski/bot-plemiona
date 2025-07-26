import { ApiOperation, ApiResponse } from '@nestjs/swagger';

export const DeletePlemionaCookiesDecorators = () => {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        ApiOperation({
            summary: 'Usuń wszystkie cookies dla plemiona.pl',
            description: 'Usuwa wszystkie ustawione cookies dla domeny plemiona.pl'
        })(target, propertyKey, descriptor);

        ApiResponse({
            status: 200,
            description: 'Wszystkie cookies zostały usunięte'
        })(target, propertyKey, descriptor);

        ApiResponse({
            status: 204,
            description: 'Brak cookies do usunięcia'
        })(target, propertyKey, descriptor);
    };
}; 