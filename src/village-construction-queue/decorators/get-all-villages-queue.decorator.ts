import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HttpStatus } from '@nestjs/common';
import { VillageConstructionQueueEntity } from '../entities/village-construction-queue.entity';

export const GetAllVillagesQueueDecorators = () => {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        ApiOperation({
            summary: 'Get construction queue for all villages',
            description: 'Retrieves all buildings in the construction queue for all villages, ordered by creation time (FIFO).'
        })(target, propertyKey, descriptor);

        ApiResponse({
            status: HttpStatus.OK,
            description: 'Successfully retrieved construction queue for all villages',
            type: [VillageConstructionQueueEntity]
        })(target, propertyKey, descriptor);
    };
}; 