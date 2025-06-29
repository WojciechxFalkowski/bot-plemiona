import { ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { HttpStatus } from '@nestjs/common';

export const ScrapeVillageQueueDecorators = () => {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        ApiOperation({
            summary: 'Scrape village game queue for a specific village',
            description: 'Scrapes village game queue for a specific village based on village name'
        })(target, propertyKey, descriptor);

        ApiParam({
            name: 'villageName',
            description: 'Village name to scrape queue for',
            example: '0001'
        })(target, propertyKey, descriptor);

        ApiResponse({
            status: HttpStatus.OK,
            description: 'Successfully scraped village queue',
            schema: {
                type: 'object',
                properties: {
                    villageInfo: {
                        type: 'object',
                        description: 'Village information'
                    },
                    buildingLevels: {
                        type: 'object',
                        description: 'Current building levels in the village'
                    },
                    buildQueue: {
                        type: 'array',
                        description: 'Current build queue items',
                        items: {
                            type: 'object'
                        }
                    }
                }
            }
        })(target, propertyKey, descriptor);

        ApiResponse({
            status: HttpStatus.NOT_FOUND,
            description: 'Village not found'
        })(target, propertyKey, descriptor);
    };
}; 