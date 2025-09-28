import { IsInt, IsString, IsOptional, Min, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateMiniAttackStrategyDto {
    @ApiProperty({
        description: 'ID serwera',
        example: 217
    })
    @IsInt()
    @IsNotEmpty()
    serverId: number;

    @ApiProperty({
        description: 'ID wioski',
        example: '32005'
    })
    @IsString()
    @IsNotEmpty()
    villageId: string;

    // Jednostki piechoty
    @ApiProperty({
        description: 'Liczba pikinierów w ataku',
        example: 2,
        required: false,
        default: 0
    })
    @IsOptional()
    @IsInt()
    @Min(0)
    spear?: number;

    @ApiProperty({
        description: 'Liczba mieczników w ataku',
        example: 2,
        required: false,
        default: 0
    })
    @IsOptional()
    @IsInt()
    @Min(0)
    sword?: number;

    @ApiProperty({
        description: 'Liczba toporników w ataku',
        example: 0,
        required: false,
        default: 0
    })
    @IsOptional()
    @IsInt()
    @Min(0)
    axe?: number;

    @ApiProperty({
        description: 'Liczba łuczników w ataku',
        example: 0,
        required: false,
        default: 0
    })
    @IsOptional()
    @IsInt()
    @Min(0)
    archer?: number;

    @ApiProperty({
        description: 'Liczba zwiadowców w ataku',
        example: 0,
        required: false,
        default: 0
    })
    @IsOptional()
    @IsInt()
    @Min(0)
    spy?: number;

    // Jednostki kawalerii
    @ApiProperty({
        description: 'Liczba lekkich kawalerzystów w ataku',
        example: 0,
        required: false,
        default: 0
    })
    @IsOptional()
    @IsInt()
    @Min(0)
    light?: number;

    @ApiProperty({
        description: 'Liczba łuczników na koniu w ataku',
        example: 0,
        required: false,
        default: 0
    })
    @IsOptional()
    @IsInt()
    @Min(0)
    marcher?: number;

    @ApiProperty({
        description: 'Liczba ciężkich kawalerzystów w ataku',
        example: 0,
        required: false,
        default: 0
    })
    @IsOptional()
    @IsInt()
    @Min(0)
    heavy?: number;

    // Maszyny oblężnicze
    @ApiProperty({
        description: 'Liczba taranów w ataku',
        example: 0,
        required: false,
        default: 0
    })
    @IsOptional()
    @IsInt()
    @Min(0)
    ram?: number;

    @ApiProperty({
        description: 'Liczba katapult w ataku',
        example: 0,
        required: false,
        default: 0
    })
    @IsOptional()
    @IsInt()
    @Min(0)
    catapult?: number;

    // Jednostki specjalne
    @ApiProperty({
        description: 'Liczba rycerzy w ataku',
        example: 0,
        required: false,
        default: 0
    })
    @IsOptional()
    @IsInt()
    @Min(0)
    knight?: number;

    @ApiProperty({
        description: 'Liczba szlachciców w ataku',
        example: 0,
        required: false,
        default: 0
    })
    @IsOptional()
    @IsInt()
    @Min(0)
    snob?: number;

    @ApiProperty({
        description: 'Indeks następnego celu do ataku',
        example: 0,
        required: false,
        default: 0
    })
    @IsOptional()
    @IsInt()
    @Min(0)
    next_target_index?: number;

    @ApiProperty({
        description: 'Czy strategia jest aktywna',
        example: true,
        required: false,
        default: true
    })
    @IsOptional()
    is_active?: boolean;
} 