import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';

export function DeleteBarbarianVillageDecorators() {
    return applyDecorators(
        ApiOperation({
            summary: 'Delete barbarian village',
            description: 'Deletes a barbarian village by its target ID'
        }),
        ApiParam({
            name: 'target',
            description: 'Target ID of the barbarian village to delete',
            example: '1101'
        }),
        ApiResponse({
            status: 200,
            description: 'Barbarian village deleted successfully'
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