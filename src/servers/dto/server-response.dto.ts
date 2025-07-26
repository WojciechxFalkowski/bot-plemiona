import { ApiProperty } from '@nestjs/swagger';
import { ServerCookiesResponseDto } from './server-cookies.dto';

export class ServerResponseDto {
    @ApiProperty({
        description: 'ID serwera',
        example: 1
    })
    id: number;

    @ApiProperty({
        description: 'Kod serwera',
        example: 'pl216'
    })
    serverCode: string;

    @ApiProperty({
        description: 'Nazwa serwera',
        example: 'Świat 216'
    })
    serverName: string;

    @ApiProperty({
        description: 'Czy serwer jest aktywny',
        example: true
    })
    isActive: boolean;

    @ApiProperty({
        description: 'Data utworzenia',
        example: '2024-01-15T10:30:00Z'
    })
    createdAt: Date;

    @ApiProperty({
        description: 'Data ostatniej aktualizacji',
        example: '2024-01-15T10:30:00Z'
    })
    updatedAt: Date;

    @ApiProperty({
        description: 'Cookies serwera',
        type: ServerCookiesResponseDto,
        required: false
    })
    cookies?: ServerCookiesResponseDto;
} 