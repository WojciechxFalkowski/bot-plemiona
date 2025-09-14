import { IsNumber, IsString, IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PlayerVillageAttackStrategyDto {
    @ApiProperty({ description: 'ID strategii' })
    @IsNumber()
    id: number;

    @ApiProperty({ description: 'ID serwera' })
    @IsNumber()
    serverId: number;

    @ApiProperty({ description: 'ID wioski źródłowej' })
    @IsString()
    villageId: string;

    @ApiProperty({ description: 'Liczba pikinierów' })
    @IsInt()
    @Min(0)
    spear: number;

    @ApiProperty({ description: 'Liczba mieczników' })
    @IsInt()
    @Min(0)
    sword: number;

    @ApiProperty({ description: 'Liczba toporników' })
    @IsInt()
    @Min(0)
    axe: number;

    @ApiProperty({ description: 'Liczba łuczników' })
    @IsInt()
    @Min(0)
    archer: number;

    @ApiProperty({ description: 'Liczba zwiadowców' })
    @IsInt()
    @Min(0)
    spy: number;

    @ApiProperty({ description: 'Liczba lekkiej kawalerii' })
    @IsInt()
    @Min(0)
    light: number;

    @ApiProperty({ description: 'Liczba łuczników konnych' })
    @IsInt()
    @Min(0)
    marcher: number;

    @ApiProperty({ description: 'Liczba ciężkiej kawalerii' })
    @IsInt()
    @Min(0)
    heavy: number;

    @ApiProperty({ description: 'Liczba taranów' })
    @IsInt()
    @Min(0)
    ram: number;

    @ApiProperty({ description: 'Liczba katapult' })
    @IsInt()
    @Min(0)
    catapult: number;

    @ApiProperty({ description: 'Liczba rycerzy' })
    @IsInt()
    @Min(0)
    knight: number;

    @ApiProperty({ description: 'Liczba szlachciców' })
    @IsInt()
    @Min(0)
    snob: number;

    @ApiProperty({ description: 'Data utworzenia' })
    createdAt: Date;

    @ApiProperty({ description: 'Data aktualizacji' })
    updatedAt: Date;
}
