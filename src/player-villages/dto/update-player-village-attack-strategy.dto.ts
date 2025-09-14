import { IsOptional, IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdatePlayerVillageAttackStrategyDto {
    @ApiProperty({ description: 'Liczba pikinierów', required: false })
    @IsOptional()
    @IsInt()
    @Min(0)
    spear?: number;

    @ApiProperty({ description: 'Liczba mieczników', required: false })
    @IsOptional()
    @IsInt()
    @Min(0)
    sword?: number;

    @ApiProperty({ description: 'Liczba toporników', required: false })
    @IsOptional()
    @IsInt()
    @Min(0)
    axe?: number;

    @ApiProperty({ description: 'Liczba łuczników', required: false })
    @IsOptional()
    @IsInt()
    @Min(0)
    archer?: number;

    @ApiProperty({ description: 'Liczba zwiadowców', required: false })
    @IsOptional()
    @IsInt()
    @Min(0)
    spy?: number;

    @ApiProperty({ description: 'Liczba lekkiej kawalerii', required: false })
    @IsOptional()
    @IsInt()
    @Min(0)
    light?: number;

    @ApiProperty({ description: 'Liczba łuczników konnych', required: false })
    @IsOptional()
    @IsInt()
    @Min(0)
    marcher?: number;

    @ApiProperty({ description: 'Liczba ciężkiej kawalerii', required: false })
    @IsOptional()
    @IsInt()
    @Min(0)
    heavy?: number;

    @ApiProperty({ description: 'Liczba taranów', required: false })
    @IsOptional()
    @IsInt()
    @Min(0)
    ram?: number;

    @ApiProperty({ description: 'Liczba katapult', required: false })
    @IsOptional()
    @IsInt()
    @Min(0)
    catapult?: number;

    @ApiProperty({ description: 'Liczba rycerzy', required: false })
    @IsOptional()
    @IsInt()
    @Min(0)
    knight?: number;

    @ApiProperty({ description: 'Liczba szlachciców', required: false })
    @IsOptional()
    @IsInt()
    @Min(0)
    snob?: number;
}
