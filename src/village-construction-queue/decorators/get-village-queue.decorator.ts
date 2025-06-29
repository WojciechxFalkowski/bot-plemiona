import { ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { HttpStatus } from '@nestjs/common';
import { VillageConstructionQueueEntity } from '../entities/village-construction-queue.entity';

export const GetVillageQueueDecorators = () => {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        ApiOperation({
            summary: 'Get construction queue for village',
            description: 'Retrieves all buildings in the construction queue for a specific village, ordered by creation time (FIFO).'
        })(target, propertyKey, descriptor);

        ApiParam({
            name: 'villageName',
            description: 'Village name to get queue for',
            example: '0001'
        })(target, propertyKey, descriptor);

        ApiResponse({
            status: HttpStatus.OK,
            description: 'Successfully retrieved construction queue',
            type: [VillageConstructionQueueEntity]
        })(target, propertyKey, descriptor);

        ApiResponse({
            status: HttpStatus.NOT_FOUND,
            description: 'Village not found'
        })(target, propertyKey, descriptor);
    };
}; 