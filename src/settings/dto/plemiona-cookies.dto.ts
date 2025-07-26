import { ApiProperty } from '@nestjs/swagger';
import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { PlemionaCookieDto } from './plemiona-cookie.dto';

/**
 * Data transfer object for an array of Plemiona cookies
 * Used when sending multiple cookies at once
 */
export class PlemionaCookiesDto {
    @ApiProperty({
        type: [PlemionaCookieDto],
        description: 'Array of Plemiona cookies',
        required: true
    })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => PlemionaCookieDto)
    cookies: PlemionaCookieDto[];
} 