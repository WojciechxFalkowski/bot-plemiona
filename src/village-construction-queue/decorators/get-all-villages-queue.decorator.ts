import { ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { HttpStatus } from '@nestjs/common';
import { VillageConstructionQueueEntity } from '../entities/village-construction-queue.entity';

export const GetAllVillagesQueueDecorators = () => {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        ApiOperation({
            summary: 'Get construction queue for all villages',
            description: 'Retrieves all buildings in the construction queue for all villages or filtered by server, ordered by creation time (FIFO).'
        })(target, propertyKey, descriptor);

        ApiQuery({
            name: 'serverId',
            required: false,
            type: Number,
            description: 'Optional server ID to filter construction queue by specific server'
        })(target, propertyKey, descriptor);

        ApiResponse({
            status: HttpStatus.OK,
            description: 'Successfully retrieved construction queue for all villages or filtered by server',
            type: [VillageConstructionQueueEntity]
        })(target, propertyKey, descriptor);
    };
}; 