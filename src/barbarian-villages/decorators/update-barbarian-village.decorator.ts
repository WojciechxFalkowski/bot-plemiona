import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiBody, ApiResponse } from '@nestjs/swagger';
import { BarbarianVillageDto, UpdateBarbarianVillageDto } from '../dto';

export function UpdateBarbarianVillageDecorators() {
    return applyDecorators(
        ApiOperation({
            summary: 'Update barbarian village',
            description: 'Updates an existing barbarian village by its target ID'
        }),
        ApiParam({
            name: 'target',
            description: 'Target ID of the barbarian village to update',
            example: '1101'
        }),
        ApiBody({
            type: UpdateBarbarianVillageDto,
            description: 'Updated barbarian village data'
        }),
        ApiResponse({
            status: 200,
            description: 'Barbarian village updated successfully',
            type: BarbarianVillageDto
        }),
        ApiResponse({
            status: 400,
            description: 'Bad request - validation failed'
        }),
        ApiResponse({
            status: 404,
            description: 'Barbarian village not found'
        }),
        ApiResponse({
            status: 500,
            description: 'Internal server error'
        })
    );
} 