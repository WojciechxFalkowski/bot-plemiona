import { IsString, IsNotEmpty, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PlemionaCookieDto {
    @ApiProperty({
        description: 'Nazwa cookie',
        example: 'pl_auth'
    })
    @IsString()
    @IsNotEmpty()
    @Length(1, 255)
    name: string;

    @ApiProperty({
        description: 'Ścieżka cookie',
        example: '/'
    })
    @IsString()
    @IsNotEmpty()
    @Length(1, 255)
    path: string;

    @ApiProperty({
        description: 'Wartość cookie',
        example: '69a13f7d6688:631d5f23baec92d2dc8d1a4d724250f862e640b21670255261db23da7a4b19af'
    })
    @IsString()
    @IsNotEmpty()
    value: string;

    @ApiProperty({
        description: 'Domena cookie',
        example: '.plemiona.pl'
    })
    @IsString()
    @IsNotEmpty()
    @Length(1, 255)
    domain: string;
} 