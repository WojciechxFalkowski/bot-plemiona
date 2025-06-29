import { ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { HttpStatus } from '@nestjs/common';
import { VillageConstructionQueueEntity } from '../entities/village-construction-queue.entity';

export const RemoveFromQueueDecorators = () => {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        ApiOperation({
            summary: 'Remove building from construction queue',
            description: 'Removes a specific building from the construction queue by its ID.'
        })(target, propertyKey, descriptor);

        ApiParam({
            name: 'id',
            description: 'Queue item ID to remove',
            example: 1
        })(target, propertyKey, descriptor);

        ApiResponse({
            status: HttpStatus.OK,
            description: 'Successfully removed from queue',
            type: VillageConstructionQueueEntity
        })(target, propertyKey, descriptor);

        ApiResponse({
            status: HttpStatus.NOT_FOUND,
            description: 'Queue item not found'
        })(target, propertyKey, descriptor);
    };
}; 