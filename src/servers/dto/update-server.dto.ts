import { IsString, IsBoolean, IsOptional, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateServerDto {
    @ApiProperty({
        description: 'Kod serwera (np. pl216)',
        example: 'pl216',
        maxLength: 10,
        required: false
    })
    @IsOptional()
    @IsString()
    @Length(1, 10)
    serverCode?: string;

    @ApiProperty({
        description: 'Nazwa serwera',
        example: 'Świat 216',
        maxLength: 100,
        required: false
    })
    @IsOptional()
    @IsString()
    @Length(1, 100)
    serverName?: string;

    @ApiProperty({
        description: 'Czy serwer jest aktywny',
        example: true,
        required: false
    })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
} 