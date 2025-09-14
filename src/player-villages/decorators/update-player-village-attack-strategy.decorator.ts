import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { UpdatePlayerVillageAttackStrategyDto } from '../dto/update-player-village-attack-strategy.dto';
import { PlayerVillageAttackStrategyDto } from '../dto/player-village-attack-strategy.dto';

export function UpdatePlayerVillageAttackStrategyDecorator() {
    return applyDecorators(
        ApiOperation({ 
            summary: 'Update player village attack strategy',
            description: 'Update an existing player village attack strategy'
        }),
        ApiParam({ 
            name: 'id', 
            type: Number, 
            description: 'Player village attack strategy ID' 
        }),
        ApiBody({ 
            type: UpdatePlayerVillageAttackStrategyDto,
            description: 'Player village attack strategy update data'
        }),
        ApiResponse({ 
            status: 200, 
            description: 'Player village attack strategy updated successfully', 
            type: PlayerVillageAttackStrategyDto 
        }),
        ApiResponse({ 
            status: 400, 
            description: 'Bad request - Invalid input data' 
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
