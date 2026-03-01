import { ApiOperation, ApiResponse } from '@nestjs/swagger';

export const GetCrawlerStatusDecorator = () => {
    return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
        ApiOperation({
            summary: 'Pobiera status crawlera',
            description:
                'Zwraca informację o aktywnym serwerze (crawler pracuje), listę serwerów zablokowanych przez reCAPTCHA, czas do następnego zadania (nextScheduledInSeconds) oraz informację o zaplanowanym zadaniu (nextScheduledTask: taskType, serverCode) gdy crawler jest bezczynny'
        })(target, propertyKey, descriptor);

        ApiResponse({
            status: 200,
            description: 'Status crawlera pobrany pomyślnie'
        })(target, propertyKey, descriptor);

        return descriptor;
    };
};
