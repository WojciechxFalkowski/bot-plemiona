import { IsString, IsInt, Min, Max, IsNotEmpty, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { BuildingId } from '../../crawler/pages/village-detail.page';

export class CreateConstructionQueueApiDto {
    @ApiProperty({
        description: 'Nazwa wioski',
        example: '0001'
    })
    @IsString()
    @IsNotEmpty()
    villageName: string;

    @ApiProperty({
        description: 'ID budynku według TRIBAL_WARS_BUILDINGS',
        example: 'main',
        enum: [
            'main', 'wood', 'stone', 'iron', 'farm', 'storage', 'hide', 'place',
            'barracks', 'stable', 'garage', 'smith', 'wall', 'market', 'snob',
            'church', 'first_church', 'watchtower', 'statue'
        ],
        type: 'string'
    })
    @IsEnum(BuildingId)
    buildingId: BuildingId;

    @ApiProperty({
        description: 'Docelowy poziom budynku (opcjonalny - jeśli nie podany, oblicza automatycznie)',
        example: 15,
        minimum: 1,
        maximum: 30,
        required: false
    })
    @IsInt()
    @Min(1)
    @Max(30)
    targetLevel?: number;

    @ApiProperty({
        description: 'ID serwera',
        example: 216
    })
    @IsInt()
    @IsNotEmpty()
    serverId: number;
} 