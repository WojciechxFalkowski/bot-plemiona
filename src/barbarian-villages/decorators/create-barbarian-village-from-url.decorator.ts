import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiBody, ApiResponse } from '@nestjs/swagger';
import { BarbarianVillageDto, CreateBarbarianVillageFromUrlDto } from '../dto';

export function CreateBarbarianVillageFromUrlDecorators() {
    return applyDecorators(
        ApiOperation({
            summary: 'Create barbarian village from URL',
            description: 'Creates a new barbarian village by parsing Plemiona game URL to extract ID and coordinates'
        }),
        ApiBody({
            type: CreateBarbarianVillageFromUrlDto,
            description: 'Plemiona game URL containing village information'
        }),
        ApiResponse({
            status: 201,
            description: 'Barbarian village created successfully from URL',
            type: BarbarianVillageDto
        }),
        ApiResponse({
            status: 400,
            description: 'Bad request - invalid URL format or missing required parameters'
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