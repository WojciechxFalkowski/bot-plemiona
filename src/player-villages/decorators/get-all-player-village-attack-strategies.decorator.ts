import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { PlayerVillageAttackStrategyDto } from '../dto/player-village-attack-strategy.dto';

export function GetAllPlayerVillageAttackStrategiesDecorator() {
    return applyDecorators(
        ApiOperation({ 
            summary: 'Get all player village attack strategies',
            description: 'Retrieve all player village attack strategies with optional server filtering'
        }),
        ApiQuery({ 
            name: 'serverId', 
            required: false, 
            type: Number, 
            description: 'Filter strategies by server ID' 
        }),
        ApiResponse({ 
            status: 200, 
            description: 'List of player village attack strategies retrieved successfully', 
            type: [PlayerVillageAttackStrategyDto] 
        }),
        ApiResponse({ 
            status: 500, 
            description: 'Internal server error' 
        })
    );
}
