import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { BarbarianVillageDto } from '../dto';

export function GetAllBarbarianVillagesDecorators() {
    return applyDecorators(
        ApiOperation({
            summary: 'Get all barbarian villages',
            description: 'Retrieves a list of all barbarian villages with their coordinates and target information'
        }),
        ApiResponse({
            status: 200,
            description: 'List of barbarian villages retrieved successfully',
            type: [BarbarianVillageDto]
        }),
        ApiResponse({
            status: 500,
            description: 'Internal server error'
        })
    );
} 