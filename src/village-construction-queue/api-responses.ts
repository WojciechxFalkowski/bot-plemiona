import { ApiResponse } from '@nestjs/swagger';

export const ApiResponseSuccess = ApiResponse({
    status: 201,
    description: 'Building successfully added to construction queue',
    schema: {
        type: 'object',
        properties: {
            id: { type: 'number', example: 1 },
            villageId: { type: 'string', example: '12142' },
            buildingId: { type: 'string', example: 'main' },
            buildingName: { type: 'string', example: 'Ratusz' },
            targetLevel: { type: 'number', example: 5 },
            status: { type: 'string', example: 'pending' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
        }
    }
});

export const ApiResponseBadRequest = ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid building ID, target level exceeds maximum, or level validation failed',
    schema: {
        type: 'object',
        properties: {
            statusCode: { type: 'number', example: 400 },
            message: { type: 'string', example: 'Target level 35 exceeds maximum level 30 for building \'Ratusz\'' },
            error: { type: 'string', example: 'Bad Request' }
        }
    }
});

export const ApiResponseNotFound = ApiResponse({
    status: 404,
    description: 'Not Found - Village with specified ID does not exist',
    schema: {
        type: 'object',
        properties: {
            statusCode: { type: 'number', example: 404 },
            message: { type: 'string', example: 'Village with ID 12142 not found' },
            error: { type: 'string', example: 'Not Found' }
        }
    }
});

export const ApiResponseConflict = ApiResponse({
    status: 409,
    description: 'Conflict - Building with specified level already exists in queue',
    schema: {
        type: 'object',
        properties: {
            statusCode: { type: 'number', example: 409 },
            message: { type: 'string', example: 'Building \'Ratusz\' level 5 is already in queue for village 12142' },
            error: { type: 'string', example: 'Conflict' }
        }
    }
});

// Złożony dekorator zawierający wszystkie responses
export const ApiResponsesAddToQueue = (...decorators: any[]) => (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    ApiResponseSuccess(target, propertyKey, descriptor);
    ApiResponseBadRequest(target, propertyKey, descriptor);
    ApiResponseNotFound(target, propertyKey, descriptor);
    ApiResponseConflict(target, propertyKey, descriptor);
    
    // Zastosuj dodatkowe dekoratory jeśli są przekazane
    decorators.forEach(decorator => decorator(target, propertyKey, descriptor));
}; 