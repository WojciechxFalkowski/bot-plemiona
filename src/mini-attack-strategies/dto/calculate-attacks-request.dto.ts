import { IsInt, IsOptional, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CalculateAttacksRequestDto {
    @ApiProperty({
        description: 'Dostępne pikinierzy w wiosce',
        example: 10,
        required: false,
        default: 0
    })
    @IsOptional()
    @IsInt()
    @Min(0)
    availableSpear?: number;

    @ApiProperty({
        description: 'Dostępni miecznicy w wiosce',
        example: 8,
        required: false,
        default: 0
    })
    @IsOptional()
    @IsInt()
    @Min(0)
    availableSword?: number;

    @ApiProperty({
        description: 'Dostępni toporników w wiosce',
        example: 0,
        required: false,
        default: 0
    })
    @IsOptional()
    @IsInt()
    @Min(0)
    availableAxe?: number;

    @ApiProperty({
        description: 'Dostępni łucznicy w wiosce',
        example: 0,
        required: false,
        default: 0
    })
    @IsOptional()
    @IsInt()
    @Min(0)
    availableArcher?: number;

    @ApiProperty({
        description: 'Dostępni zwiadowcy w wiosce',
        example: 0,
        required: false,
        default: 0
    })
    @IsOptional()
    @IsInt()
    @Min(0)
    availableSpy?: number;

    @ApiProperty({
        description: 'Dostępni lekcy kawalerzyści w wiosce',
        example: 5,
        required: false,
        default: 0
    })
    @IsOptional()
    @IsInt()
    @Min(0)
    availableLight?: number;

    @ApiProperty({
        description: 'Dostępni łucznicy na koniu w wiosce',
        example: 0,
        required: false,
        default: 0
    })
    @IsOptional()
    @IsInt()
    @Min(0)
    availableMarcher?: number;

    @ApiProperty({
        description: 'Dostępni ciężcy kawalerzyści w wiosce',
        example: 0,
        required: false,
        default: 0
    })
    @IsOptional()
    @IsInt()
    @Min(0)
    availableHeavy?: number;

    @ApiProperty({
        description: 'Dostępne tarany w wiosce',
        example: 0,
        required: false,
        default: 0
    })
    @IsOptional()
    @IsInt()
    @Min(0)
    availableRam?: number;

    @ApiProperty({
        description: 'Dostępne katapulty w wiosce',
        example: 0,
        required: false,
        default: 0
    })
    @IsOptional()
    @IsInt()
    @Min(0)
    availableCatapult?: number;

    @ApiProperty({
        description: 'Dostępni rycerze w wiosce',
        example: 0,
        required: false,
        default: 0
    })
    @IsOptional()
    @IsInt()
    @Min(0)
    availableKnight?: number;

    @ApiProperty({
        description: 'Dostępni szlachcice w wiosce',
        example: 0,
        required: false,
        default: 0
    })
    @IsOptional()
    @IsInt()
    @Min(0)
    availableSnob?: number;
} 