import { ApiProperty } from '@nestjs/swagger';

export class BuildingDto {
  @ApiProperty({
    description: 'Screen identifier for the building',
    example: 'main',
  })
  screen: string;

  @ApiProperty({
    description: 'Polish name of the building',
    example: 'Ratusz',
  })
  name: string;

  @ApiProperty({
    description: 'Maximum level for the building',
    example: 30,
  })
  maxLevel: number;

  @ApiProperty({
    description: 'URL path template for accessing the building page',
    example: '/game.php?village={villageId}&screen=main',
  })
  href: string;
} 