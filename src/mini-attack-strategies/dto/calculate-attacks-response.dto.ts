import { ApiProperty } from '@nestjs/swagger';

export class CalculateAttacksResponseDto {
    @ApiProperty({
        description: 'Maksymalna liczba ataków możliwych do wysłania',
        example: 4
    })
    maxAttacks: number;

    @ApiProperty({
        description: 'Jednostka ograniczająca (bottleneck)',
        example: 'sword'
    })
    bottleneckUnit: string;

    @ApiProperty({
        description: 'Polska nazwa jednostki ograniczającej',
        example: 'Miecznik'
    })
    bottleneckUnitPL: string;

    @ApiProperty({
        description: 'Dostępna liczba jednostek ograniczających',
        example: 8
    })
    availableBottleneckUnits: number;

    @ApiProperty({
        description: 'Wymagana liczba jednostek ograniczających na atak',
        example: 2
    })
    requiredBottleneckUnits: number;

    @ApiProperty({
        description: 'Szczegóły kalkulacji dla każdej jednostki',
        example: {
            spear: { available: 10, required: 2, maxAttacks: 5 },
            sword: { available: 8, required: 2, maxAttacks: 4 },
            light: { available: 0, required: 0, maxAttacks: null }
        }
    })
    calculationDetails: Record<string, {
        available: number;
        required: number;
        maxAttacks: number | null;
    }>;
} 