import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

/**
 * Data transfer object for a single Plemiona cookie
 * Contains all essential properties for a cookie used in the Plemiona game
 */
export class PlemionaCookieDto {
    @ApiProperty({
        example: 'pl_auth',
        description: 'The name of the cookie as defined by the Plemiona website',
        required: true
    })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiProperty({
        example: '69a13f7d6688:631d5f23baec92d2dc8d1a4d724250f862e640b21670255261db23da7a4b19af',
        description: 'The value of the cookie, typically a hash or identifier',
        required: true
    })
    @IsString()
    @IsNotEmpty()
    value: string;

    @ApiProperty({
        example: '.plemiona.pl',
        description: 'The domain for which the cookie is valid, usually .plemiona.pl or pl216.plemiona.pl',
        required: true
    })
    @IsString()
    @IsNotEmpty()
    domain: string;

    @ApiProperty({
        example: '/',
        description: 'The path for which the cookie is valid, usually /',
        required: true
    })
    @IsString()
    @IsNotEmpty()
    path: string;

    @ApiProperty({
        example: 1714464392,
        description: 'The expiration timestamp of the cookie in seconds (Unix timestamp). Use -1 for session cookies',
        required: true
    })
    @IsNotEmpty()
    expires: number;
} 