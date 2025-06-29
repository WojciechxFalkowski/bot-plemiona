import { ApiOperation } from '@nestjs/swagger';

export const ScrapeAllVillagesQueueDecorators = () => {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        ApiOperation({
            summary: 'Scrape all villages game queue',
            description: 'Scrapes all villages game queue'
        })(target, propertyKey, descriptor);
    };
}; 