import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsInt, Min, Max } from 'class-validator';

/**
 * Data transfer object for creating a new barbarian village
 * Contains all required fields for village creation
 */
export class CreateBarbarianVillageDto {
    @ApiProperty({
        example: '1101',
        description: 'Unique target ID for the barbarian village',
        required: true
    })
    @IsString()
    @IsNotEmpty()
    target: string;

    @ApiProperty({
        example: 'Wioska barbarzyńska',
        description: 'Name of the barbarian village',
        required: true
    })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty({
        example: 542,
        description: 'X coordinate of the barbarian village',
        required: true,
        minimum: 0,
        maximum: 1000
    })
    @IsInt()
    @Min(0)
    @Max(1000)
    coordinateX: number;

    @ApiProperty({
        example: 489,
        description: 'Y coordinate of the barbarian village',
        required: true,
        minimum: 0,
        maximum: 1000
    })
    @IsInt()
    @Min(0)
    @Max(1000)
    coordinateY: number;
} 