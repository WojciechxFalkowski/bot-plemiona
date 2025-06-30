import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { BarbarianVillageDto } from '../dto';

export function GetBarbarianVillageDecorators() {
    return applyDecorators(
        ApiOperation({
            summary: 'Get barbarian village by target',
            description: 'Retrieves a specific barbarian village by its target ID'
        }),
        ApiParam({
            name: 'target',
            description: 'Target ID of the barbarian village',
            example: '1101'
        }),
        ApiResponse({
            status: 200,
            description: 'Barbarian village found and returned',
            type: BarbarianVillageDto
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