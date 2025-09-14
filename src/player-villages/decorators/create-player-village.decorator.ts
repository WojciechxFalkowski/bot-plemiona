import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { CreatePlayerVillageDto } from '../dto/create-player-village.dto';
import { PlayerVillageDto } from '../dto/player-village.dto';

export function CreatePlayerVillageDecorator() {
    return applyDecorators(
        ApiOperation({ 
            summary: 'Create a new player village',
            description: 'Add a new player village to the database'
        }),
        ApiBody({ 
            type: CreatePlayerVillageDto,
            description: 'Player village data'
        }),
        ApiResponse({ 
            status: 201, 
            description: 'Player village created successfully', 
            type: PlayerVillageDto 
        }),
        ApiResponse({ 
            status: 400, 
            description: 'Bad request - Invalid input data' 
        }),
        ApiResponse({ 
            status: 409, 
            description: 'Conflict - Player village already exists for this server' 
        }),
        ApiResponse({ 
            status: 500, 
            description: 'Internal server error' 
        })
    );
}
