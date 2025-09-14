import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { PlayerVillageDto } from '../dto/player-village.dto';

export function GetAllPlayerVillagesDecorator() {
    return applyDecorators(
        ApiOperation({ 
            summary: 'Get all player villages',
            description: 'Retrieve all player villages with optional server filtering'
        }),
        ApiQuery({ 
            name: 'serverId', 
            required: false, 
            type: Number, 
            description: 'Filter villages by server ID' 
        }),
        ApiResponse({ 
            status: 200, 
            description: 'List of player villages retrieved successfully', 
            type: [PlayerVillageDto] 
        }),
        ApiResponse({ 
            status: 500, 
            description: 'Internal server error' 
        })
    );
}
