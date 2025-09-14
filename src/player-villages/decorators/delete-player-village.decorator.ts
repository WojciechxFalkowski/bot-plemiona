import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';

export function DeletePlayerVillageDecorator() {
    return applyDecorators(
        ApiOperation({ 
            summary: 'Delete player village',
            description: 'Remove a player village from the database'
        }),
        ApiParam({ 
            name: 'id', 
            type: Number, 
            description: 'Player village ID' 
        }),
        ApiResponse({ 
            status: 200, 
            description: 'Player village deleted successfully' 
        }),
        ApiResponse({ 
            status: 404, 
            description: 'Player village not found' 
        }),
        ApiResponse({ 
            status: 500, 
            description: 'Internal server error' 
        })
    );
}
