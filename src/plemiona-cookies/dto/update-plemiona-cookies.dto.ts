import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { PlemionaCookieDto } from './plemiona-cookie.dto';

export class UpdatePlemionaCookiesDto {
    @ApiProperty({
        description: 'Lista cookies dla plemiona.pl',
        type: [PlemionaCookieDto],
        example: [{
            name: 'pl_auth',
            path: '/',
            value: '69a13f7d6688:631d5f23baec92d2dc8d1a4d724250f862e640b21670255261db23da7a4b19af',
            domain: '.plemiona.pl'
        }]
    })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => PlemionaCookieDto)
    cookies: PlemionaCookieDto[];
} 