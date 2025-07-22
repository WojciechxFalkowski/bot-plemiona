import { ApiProperty } from '@nestjs/swagger';
import { BuildingDto } from './building.dto';

export class BuildingsResponseDto {
  @ApiProperty({
    description: 'List of all available buildings in the game',
    type: [BuildingDto],
  })
  buildings: BuildingDto[];
} 