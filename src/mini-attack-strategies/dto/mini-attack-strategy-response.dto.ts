import { ApiProperty } from '@nestjs/swagger';

export class MiniAttackStrategyResponseDto {
    @ApiProperty({
        description: 'Unikalny identyfikator strategii',
        example: 1
    })
    id: number;

    @ApiProperty({
        description: 'ID serwera',
        example: 217
    })
    serverId: number;

    @ApiProperty({
        description: 'ID wioski',
        example: '32005'
    })
    villageId: string;

    // Jednostki piechoty
    @ApiProperty({
        description: 'Liczba pikinierów w ataku',
        example: 2
    })
    spear: number;

    @ApiProperty({
        description: 'Liczba mieczników w ataku',
        example: 2
    })
    sword: number;

    @ApiProperty({
        description: 'Liczba toporników w ataku',
        example: 0
    })
    axe: number;

    @ApiProperty({
        description: 'Liczba łuczników w ataku',
        example: 0
    })
    archer: number;

    @ApiProperty({
        description: 'Liczba zwiadowców w ataku',
        example: 0
    })
    spy: number;

    // Jednostki kawalerii
    @ApiProperty({
        description: 'Liczba lekkich kawalerzystów w ataku',
        example: 0
    })
    light: number;

    @ApiProperty({
        description: 'Liczba łuczników na koniu w ataku',
        example: 0
    })
    marcher: number;

    @ApiProperty({
        description: 'Liczba ciężkich kawalerzystów w ataku',
        example: 0
    })
    heavy: number;

    // Maszyny oblężnicze
    @ApiProperty({
        description: 'Liczba taranów w ataku',
        example: 0
    })
    ram: number;

    @ApiProperty({
        description: 'Liczba katapult w ataku',
        example: 0
    })
    catapult: number;

    // Jednostki specjalne
    @ApiProperty({
        description: 'Liczba rycerzy w ataku',
        example: 0
    })
    knight: number;

    @ApiProperty({
        description: 'Liczba szlachciców w ataku',
        example: 0
    })
    snob: number;

    @ApiProperty({
        description: 'Indeks następnego celu do ataku',
        example: 0
    })
    next_target_index: number;

    @ApiProperty({
        description: 'Czy strategia jest aktywna',
        example: true
    })
    is_active: boolean;

    @ApiProperty({
        description: 'Data utworzenia strategii',
        example: '2025-01-26T12:00:00.000Z'
    })
    createdAt: Date;

    @ApiProperty({
        description: 'Data ostatniej aktualizacji strategii',
        example: '2025-01-26T12:00:00.000Z'
    })
    updatedAt: Date;
} 