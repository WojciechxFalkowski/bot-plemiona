import { ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';

/**
 * Swagger decorators for trigger-recaptcha-check endpoint
 */
export const TriggerRecaptchaCheckDecorator = () => {
    return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
        ApiOperation({
            summary: 'Wyzwól natychmiastowe sprawdzenie reCAPTCHA',
            description:
                'Ustawia następne sprawdzenie reCAPTCHA na teraz dla serwera zablokowanego przez ochronę botową. Serwer musi znajdować się na liście recaptchaBlockedServerIds. Następny tick schedulera wykona RecaptchaCheck od razu.'
        })(target, propertyKey, descriptor);

        ApiParam({
            name: 'serverId',
            description: 'ID serwera',
            type: Number,
            example: 1
        })(target, propertyKey, descriptor);

        ApiResponse({
            status: 200,
            description: 'Sprawdzenie reCAPTCHA zostało zaplanowane na teraz'
        })(target, propertyKey, descriptor);

        ApiResponse({
            status: 400,
            description: 'Serwer nie jest zablokowany przez reCAPTCHA'
        })(target, propertyKey, descriptor);

        ApiResponse({
            status: 500,
            description: 'Błąd serwera podczas obsługi żądania'
        })(target, propertyKey, descriptor);

        return descriptor;
    };
};
