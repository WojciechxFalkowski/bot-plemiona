import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateServerCookiesDto {
    @ApiProperty({
        description: 'Dane cookies w formacie JSON',
        example: '{"sessionId": "abc123", "csrfToken": "xyz789"}',
        required: false
    })
    @IsOptional()
    @IsString()
    cookiesData?: string | null;
}

export class ServerCookiesResponseDto {
    @ApiProperty({
        description: 'ID serwera',
        example: 1
    })
    serverId: number;

    @ApiProperty({
        description: 'Dane cookies',
        example: '{"sessionId": "abc123", "csrfToken": "xyz789"}',
        nullable: true
    })
    cookiesData: string | null;

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
} 