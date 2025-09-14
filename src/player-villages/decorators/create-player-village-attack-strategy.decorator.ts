import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { CreatePlayerVillageAttackStrategyDto } from '../dto/create-player-village-attack-strategy.dto';
import { PlayerVillageAttackStrategyDto } from '../dto/player-village-attack-strategy.dto';

export function CreatePlayerVillageAttackStrategyDecorator() {
    return applyDecorators(
        ApiOperation({ 
            summary: 'Create a new player village attack strategy',
            description: 'Add a new player village attack strategy to the database'
        }),
        ApiBody({ 
            type: CreatePlayerVillageAttackStrategyDto,
            description: 'Player village attack strategy data'
        }),
        ApiResponse({ 
            status: 201, 
            description: 'Player village attack strategy created successfully', 
            type: PlayerVillageAttackStrategyDto 
        }),
        ApiResponse({ 
            status: 400, 
            description: 'Bad request - Invalid input data' 
        }),
        ApiResponse({ 
            status: 409, 
            description: 'Conflict - Player village attack strategy already exists for this server and village' 
        }),
        ApiResponse({ 
            status: 500, 
            description: 'Internal server error' 
        })
    );
}
