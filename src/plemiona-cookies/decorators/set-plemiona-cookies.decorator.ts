import { ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { UpdatePlemionaCookiesDto, PlemionaCookieResponseDto } from '../dto';

export const SetPlemionaCookiesDecorators = () => {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        ApiOperation({
            summary: 'Ustaw cookies dla plemiona.pl',
            description: 'Ustawia cookies dla domeny plemiona.pl (singleton pattern - zastępuje istniejące cookies)'
        })(target, propertyKey, descriptor);

        ApiBody({
            type: UpdatePlemionaCookiesDto,
            description: 'Lista cookies do ustawienia',
            examples: {
                'standard-auth': {
                    summary: 'Standardowy cookie pl_auth',
                    value: {
                        cookies: [{
                            name: 'pl_auth',
                            path: '/',
                            value: '69a13f7d6688:631d5f23baec92d2dc8d1a4d724250f862e640b21670255261db23da7a4b19af',
                            domain: '.plemiona.pl'
                        }]
                    }
                }
            }
        })(target, propertyKey, descriptor);

        ApiResponse({
            status: 200,
            description: 'Cookies zostały ustawione',
            type: [PlemionaCookieResponseDto]
        })(target, propertyKey, descriptor);

        ApiResponse({
            status: 400,
            description: 'Nieprawidłowe dane wejściowe'
        })(target, propertyKey, descriptor);
    };
}; 