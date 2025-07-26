import { ApiProperty } from '@nestjs/swagger';

export class PlemionaCookieResponseDto {
    @ApiProperty({
        description: 'ID cookie',
        example: 1
    })
    id: number;

    @ApiProperty({
        description: 'Nazwa cookie',
        example: 'pl_auth'
    })
    name: string;

    @ApiProperty({
        description: 'Ścieżka cookie',
        example: '/'
    })
    path: string;

    @ApiProperty({
        description: 'Wartość cookie',
        example: '69a13f7d6688:631d5f23baec92d2dc8d1a4d724250f862e640b21670255261db23da7a4b19af'
    })
    value: string;

    @ApiProperty({
        description: 'Domena cookie',
        example: '.plemiona.pl'
    })
    domain: string;

    @ApiProperty({
        description: 'Data utworzenia',
        example: '2025-01-26T12:00:00.000Z'
    })
    createdAt: Date;

    @ApiProperty({
        description: 'Data ostatniej aktualizacji',
        example: '2025-01-26T12:00:00.000Z'
    })
    updatedAt: Date;
} 