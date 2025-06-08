import { ApiProperty } from '@nestjs/swagger';

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
    name: string;

    @ApiProperty({
        example: 'd10f35ddd864:c449c0dffdf525d354be8b618cb73de0e1c42b42f388623341cb5c2ae2bce504',
        description: 'The value of the cookie, typically a hash or identifier',
        required: true
    })
    value: string;

    @ApiProperty({
        example: '.plemiona.pl',
        description: 'The domain for which the cookie is valid, usually .plemiona.pl or pl214.plemiona.pl',
        required: true
    })
    domain: string;

    @ApiProperty({
        example: '/',
        description: 'The path for which the cookie is valid, usually /',
        required: true
    })
    path: string;

    @ApiProperty({
        example: 1714464392,
        description: 'The expiration timestamp of the cookie in seconds (Unix timestamp). Use -1 for session cookies',
        required: true
    })
    expires: number;
} 