import { ApiProperty } from '@nestjs/swagger';

/**
 * Data transfer object for the auto-scavenging setting
 * Controls whether the bot should automatically run scavenging missions
 */
export class AutoScavengingDto {
    @ApiProperty({
        example: true,
        description: 'Whether automatic scavenging is enabled or disabled',
        required: true
    })
    enabled: boolean;
} 