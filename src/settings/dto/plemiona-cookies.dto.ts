import { ApiProperty } from '@nestjs/swagger';
import { PlemionaCookieDto } from './plemiona-cookie.dto';

/**
 * Data transfer object for the collection of Plemiona cookies
 * Contains an array of all cookies needed for the Plemiona bot to function
 */
export class PlemionaCookiesDto {
    @ApiProperty({
        type: [PlemionaCookieDto],
        description: 'Array of Plemiona cookies. At minimum should include pl_auth, cid, sid, and global_village_id',
        example: [
            {
                name: 'pl_auth',
                value: 'd10f35ddd864:c449c0dffdf525d354be8b618cb73de0e1c42b42f388623341cb5c2ae2bce504',
                domain: '.plemiona.pl',
                path: '/',
                expires: 1714464392
            },
            {
                name: 'cid',
                value: '113995269',
                domain: '.plemiona.pl',
                path: '/',
                expires: 1714464392
            },
            {
                name: 'sid',
                value: '0%3Abba1c87a4d77b774238cfdde1ddf8c8b426c1a4416e0f0f375d2c7edaa23202126cb0af5fbe1e0fc7143bfd36637a86e614391359155067522dcfdcd80bbaf7f',
                domain: 'pl216.plemiona.pl',
                path: '/',
                expires: -1
            },
            {
                name: 'global_village_id',
                value: '12142',
                domain: 'pl216.plemiona.pl',
                path: '/',
                expires: -1
            }
        ]
    })
    cookies: PlemionaCookieDto[];
} 