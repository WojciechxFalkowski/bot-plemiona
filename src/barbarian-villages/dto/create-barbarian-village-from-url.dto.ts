import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsUrl } from 'class-validator';

/**
 * Data transfer object for creating a barbarian village from URL
 * Extracts village data from Plemiona game URL
 */
export class CreateBarbarianVillageFromUrlDto {
    @ApiProperty({
        example: 'https://pl216.plemiona.pl/game.php?village=2197&screen=info_village&id=3137#553;486',
        description: 'URL from Plemiona game containing village ID and coordinates',
        required: true
    })
    @IsString()
    @IsNotEmpty()
    url: string;
} 