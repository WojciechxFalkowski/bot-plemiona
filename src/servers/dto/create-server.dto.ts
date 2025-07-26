import { IsString, IsBoolean, IsOptional, Length, IsNotEmpty, IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateServerDto {
    @ApiProperty({
        description: 'ID serwera',
        example: 216,
        required: true,
        default: 216
    })
    @IsNotEmpty()
    @IsInt()
    id: number;

    @ApiProperty({
        description: 'Kod serwera (np. pl216)',
        example: 'pl216',
        maxLength: 10
    })
    @IsString()
    @Length(1, 10)
    serverCode: string;

    @ApiProperty({
        description: 'Nazwa serwera',
        example: 'Świat 216',
        maxLength: 100
    })
    @IsString()
    @Length(1, 100)
    serverName: string;

    @ApiProperty({
        description: 'Czy serwer jest aktywny',
        example: true,
        required: false,
        default: true
    })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean = true;
} 