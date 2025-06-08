import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiBody, ApiResponse } from '@nestjs/swagger';
import { AutoScavengingDto } from '../dto';

export function UpdateAutoScavengingDecorators() {
    return applyDecorators(
        ApiOperation({
            summary: 'Update auto-scavenging setting',
            description: 'Enables or disables automatic scavenging'
        }),
        ApiBody({
            type: AutoScavengingDto,
            description: 'The auto-scavenging setting value'
        }),
        ApiResponse({
            status: 200,
            description: 'Auto-scavenging setting updated successfully'
        })
    );
} 