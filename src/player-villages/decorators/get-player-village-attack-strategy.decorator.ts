import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { PlayerVillageAttackStrategyDto } from '../dto/player-village-attack-strategy.dto';

export function GetPlayerVillageAttackStrategyDecorator() {
    return applyDecorators(
        ApiOperation({ 
            summary: 'Get player village attack strategy by ID',
            description: 'Retrieve a specific player village attack strategy by its ID'
        }),
        ApiParam({ 
            name: 'id', 
            type: Number, 
            description: 'Player village attack strategy ID' 
        }),
        ApiResponse({ 
            status: 200, 
            description: 'Player village attack strategy found', 
            type: PlayerVillageAttackStrategyDto 
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
