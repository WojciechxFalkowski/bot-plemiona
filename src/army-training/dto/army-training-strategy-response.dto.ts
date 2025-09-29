import { ApiProperty } from '@nestjs/swagger';

export class ArmyTrainingStrategyResponseDto {
    @ApiProperty({
        description: 'ID strategii',
        example: 1
    })
    id: number;

    @ApiProperty({
        description: 'ID serwera',
        example: 1
    })
    serverId: number;

    @ApiProperty({
        description: 'ID wioski',
        example: '12345'
    })
    villageId: string;

    // Jednostki piechoty
    @ApiProperty({
        description: 'Liczba włóczników do treningu',
        example: 0
    })
    spear: number;

    @ApiProperty({
        description: 'Liczba mieczników do treningu',
        example: 0
    })
    sword: number;

    @ApiProperty({
        description: 'Liczba toporników do treningu',
        example: 0
    })
    axe: number;

    @ApiProperty({
        description: 'Liczba łuczników do treningu',
        example: 0
    })
    archer: number;

    @ApiProperty({
        description: 'Liczba szpiegów do treningu',
        example: 0
    })
    spy: number;

    // Jednostki kawalerii
    @ApiProperty({
        description: 'Liczba lekkiej kawalerii do treningu',
        example: 0
    })
    light: number;

    @ApiProperty({
        description: 'Liczba konnych łuczników do treningu',
        example: 0
    })
    marcher: number;

    @ApiProperty({
        description: 'Liczba ciężkiej kawalerii do treningu',
        example: 0
    })
    heavy: number;

    // Maszyny oblężnicze
    @ApiProperty({
        description: 'Liczba taranów do treningu',
        example: 0
    })
    ram: number;

    @ApiProperty({
        description: 'Liczba katapult do treningu',
        example: 0
    })
    catapult: number;

    // Jednostki specjalne
    @ApiProperty({
        description: 'Liczba rycerzy do treningu',
        example: 0
    })
    knight: number;

    @ApiProperty({
        description: 'Liczba szlachciców do treningu',
        example: 0
    })
    snob: number;

    @ApiProperty({
        description: 'Czy strategia jest aktywna',
        example: true
    })
    is_active: boolean;

    @ApiProperty({
        description: 'Data utworzenia',
        example: '2024-01-01T00:00:00.000Z'
    })
    createdAt: Date;

    @ApiProperty({
        description: 'Data ostatniej aktualizacji',
        example: '2024-01-01T00:00:00.000Z'
    })
    updatedAt: Date;
}
