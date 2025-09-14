import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';

export function DeletePlayerVillageAttackStrategyDecorator() {
    return applyDecorators(
        ApiOperation({ 
            summary: 'Delete player village attack strategy',
            description: 'Remove a player village attack strategy from the database'
        }),
        ApiParam({ 
            name: 'id', 
            type: Number, 
            description: 'Player village attack strategy ID' 
        }),
        ApiResponse({ 
            status: 200, 
            description: 'Player village attack strategy deleted successfully' 
        }),
        ApiResponse({ 
            status: 404, 
            description: 'Player village attack strategy not found' 
        }),
        ApiResponse({ 
            status: 500, 
            description: 'Internal server error' 
        })
    );
}
