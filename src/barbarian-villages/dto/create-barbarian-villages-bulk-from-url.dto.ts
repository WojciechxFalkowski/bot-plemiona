import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString, IsNotEmpty, IsInt } from 'class-validator';

/**
 * Data transfer object for creating multiple barbarian villages from URLs
 * Accepts an array of URLs from Plemiona game, serverId and villageId for validation
 */
export class CreateBarbarianVillagesBulkFromUrlDto {
    @ApiProperty({
        type: [String],
        example: [
            'https://pl223.plemiona.pl/game.php?village=8742&screen=map#619;523',
            'https://pl223.plemiona.pl/game.php?village=8742&screen=map#620;523'
        ],
        description: 'Array of URLs from Plemiona game map screen',
        required: true
    })
    @IsArray()
    @IsString({ each: true })
    @IsNotEmpty()
    urls: string[];

    @ApiProperty({
        type: Number,
        example: 223,
        description: 'Server ID for validation',
        required: true
    })
    @IsInt()
    @IsNotEmpty()
    serverId: number;

    @ApiProperty({
        type: String,
        example: '8742',
        description: 'Village ID for validation (must match village parameter in URLs)',
        required: true
    })
    @IsString()
    @IsNotEmpty()
    villageId: string;
}

