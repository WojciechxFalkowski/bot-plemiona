import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PlemionaCookieResponseDto } from '../dto';

export const GetPlemionaCookiesDecorators = () => {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        ApiOperation({
            summary: 'Pobierz cookies dla plemiona.pl',
            description: 'Zwraca wszystkie ustawione cookies dla domeny plemiona.pl (singleton pattern - max 1 zestaw cookies)'
        })(target, propertyKey, descriptor);

        ApiResponse({
            status: 200,
            description: 'Lista cookies została pobrana',
            type: [PlemionaCookieResponseDto]
        })(target, propertyKey, descriptor);
    };
}; 