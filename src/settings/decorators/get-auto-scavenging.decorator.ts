import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AutoScavengingDto } from '../dto';

export function GetAutoScavengingDecorators() {
    return applyDecorators(
        ApiOperation({
            summary: 'Get auto-scavenging setting',
            description: 'Retrieves whether automatic scavenging is enabled or disabled'
        }),
        ApiResponse({
            status: 200,
            description: 'Auto-scavenging setting retrieved successfully',
            type: AutoScavengingDto
        })
    );
} 