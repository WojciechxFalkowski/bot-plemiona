import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

/**
 * Data transfer object for creating a player village from URL
 * Extracts village data from Plemiona game URL
 */
export class CreatePlayerVillageFromUrlDto {
    @ApiProperty({
        example: 'https://pl216.plemiona.pl/game.php?village=369&screen=info_village&id=4340#491;574',
        description: 'URL from Plemiona game containing village ID (id parameter), target (target parameter) and coordinates (in hash fragment as x|y)',
        required: true
    })
    @IsString()
    @IsNotEmpty()
    url: string;
}
