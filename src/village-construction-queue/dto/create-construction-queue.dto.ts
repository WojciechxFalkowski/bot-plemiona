import { IsString, IsInt, Min, Max, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateConstructionQueueDto {
    @ApiProperty({
        description: 'ID wioski z gry',
        example: '12142'
    })
    @IsString()
    @IsNotEmpty()
    villageId: string;

    @ApiProperty({
        description: 'ID budynku według TRIBAL_WARS_BUILDINGS',
        example: 'main',
        enum: [
            'main', 'wood', 'stone', 'iron', 'farm', 'storage', 'hide', 'place',
            'barracks', 'stable', 'garage', 'smith', 'wall', 'market', 'snob',
            'church', 'first_church', 'watchtower', 'statue'
        ]
    })
    @IsString()
    @IsNotEmpty()
    buildingId: string;

    @ApiProperty({
        description: 'Docelowy poziom budynku',
        example: 15,
        minimum: 1,
        maximum: 30
    })
    @IsInt()
    @Min(1)
    @Max(30)
    targetLevel: number;
} 