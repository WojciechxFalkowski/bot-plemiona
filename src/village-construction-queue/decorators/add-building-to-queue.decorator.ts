import { ApiOperation, ApiBody } from '@nestjs/swagger';
import { CreateConstructionQueueApiDto } from '../dto/create-construction-queue-api.dto';
import { ApiResponsesAddToQueue } from '../api-responses';
import { ApiExamplesAddToQueue } from '../api-examples';

export const AddBuildingToQueueDecorators = () => {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        ApiOperation({
            summary: 'Add building to construction queue',
            description: 'Adds a building to the construction queue for a specific village. The building will be validated for requirements and level constraints including game data scraping.'
        })(target, propertyKey, descriptor);

        ApiBody({
            type: CreateConstructionQueueApiDto,
            description: 'Building details to add to queue',
            examples: ApiExamplesAddToQueue
        })(target, propertyKey, descriptor);

        ApiResponsesAddToQueue()(target, propertyKey, descriptor);
    };
}; 