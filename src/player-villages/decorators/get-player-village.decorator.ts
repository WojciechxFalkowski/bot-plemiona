import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { PlayerVillageDto } from '../dto/player-village.dto';

export function GetPlayerVillageDecorator() {
    return applyDecorators(
        ApiOperation({ 
            summary: 'Get player village by ID',
            description: 'Retrieve a specific player village by its ID'
        }),
        ApiParam({ 
            name: 'id', 
            type: Number, 
            description: 'Player village ID' 
        }),
        ApiResponse({ 
            status: 200, 
            description: 'Player village found', 
            type: PlayerVillageDto 
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
