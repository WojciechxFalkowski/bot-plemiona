import { ApiProperty } from '@nestjs/swagger';

/**
 * Data transfer object for barbarian village response
 * Represents a single barbarian village with its coordinates and target information
 */
export class BarbarianVillageDto {
    @ApiProperty({
        example: '1101',
        description: 'Unique target ID for the barbarian village',
        required: true
    })
    target: string;

    @ApiProperty({
        example: 1,
        description: 'Server ID where this barbarian village exists',
        required: true
    })
    serverId: number;

    @ApiProperty({
        example: 'Wioska barbarzyńska',
        description: 'Name of the barbarian village',
        required: true
    })
    name: string;

    @ApiProperty({
        example: 542,
        description: 'X coordinate of the barbarian village',
        required: true,
        minimum: 0,
        maximum: 1000
    })
    coordinateX: number;

    @ApiProperty({
        example: 489,
        description: 'Y coordinate of the barbarian village',
        required: true,
        minimum: 0,
        maximum: 1000
    })
    coordinateY: number;

    @ApiProperty({
        example: true,
        description: 'Flag indicating if the village can be attacked',
        required: true
    })
    canAttack: boolean;

    @ApiProperty({
        example: '2024-01-01T12:00:00Z',
        description: 'Date when the village was created'
    })
    createdAt: Date;

    @ApiProperty({
        example: '2024-01-01T12:00:00Z',
        description: 'Date when the village was last updated'
    })
    updatedAt: Date;
} 