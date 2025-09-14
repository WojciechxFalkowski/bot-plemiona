import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { UpdatePlayerVillageDto } from '../dto/update-player-village.dto';
import { PlayerVillageDto } from '../dto/player-village.dto';

export function UpdatePlayerVillageDecorator() {
    return applyDecorators(
        ApiOperation({ 
            summary: 'Update player village',
            description: 'Update an existing player village'
        }),
        ApiParam({ 
            name: 'id', 
            type: Number, 
            description: 'Player village ID' 
        }),
        ApiBody({ 
            type: UpdatePlayerVillageDto,
            description: 'Player village update data'
        }),
        ApiResponse({ 
            status: 200, 
            description: 'Player village updated successfully', 
            type: PlayerVillageDto 
        }),
        ApiResponse({ 
            status: 400, 
            description: 'Bad request - Invalid input data' 
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
