import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiBody, ApiResponse } from '@nestjs/swagger';
import { BarbarianVillageDto, CreateBarbarianVillageDto } from '../dto';

export function CreateBarbarianVillageDecorators() {
    return applyDecorators(
        ApiOperation({
            summary: 'Create new barbarian village',
            description: 'Creates a new barbarian village with the provided data'
        }),
        ApiBody({
            type: CreateBarbarianVillageDto,
            description: 'Barbarian village data to create'
        }),
        ApiResponse({
            status: 201,
            description: 'Barbarian village created successfully',
            type: BarbarianVillageDto
        }),
        ApiResponse({
            status: 400,
            description: 'Bad request - validation failed'
        }),
        ApiResponse({
            status: 409,
            description: 'Conflict - village with this target already exists'
        }),
        ApiResponse({
            status: 500,
            description: 'Internal server error'
        })
    );
} 