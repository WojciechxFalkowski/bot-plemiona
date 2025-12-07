import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class UnitsConfigDto {
  @ApiProperty({ description: 'Czy pikinierzy mają brać udział w zbieractwie', default: true })
  @IsBoolean()
  spear: boolean;

  @ApiProperty({ description: 'Czy miecznicy mają brać udział w zbieractwie', default: false })
  @IsBoolean()
  sword: boolean;

  @ApiProperty({ description: 'Czy topornicy mają brać udział w zbieractwie', default: false })
  @IsBoolean()
  axe: boolean;

  @ApiProperty({ description: 'Czy łucznicy mają brać udział w zbieractwie', default: false })
  @IsBoolean()
  archer: boolean;

  @ApiProperty({ description: 'Czy lekka kawaleria ma brać udział w zbieractwie', default: false })
  @IsBoolean()
  light: boolean;

  @ApiProperty({ description: 'Czy konni łucznicy mają brać udział w zbieractwie', default: false })
  @IsBoolean()
  marcher: boolean;

  @ApiProperty({ description: 'Czy ciężka kawaleria ma brać udział w zbieractwie', default: false })
  @IsBoolean()
  heavy: boolean;
}

export class VillageUnitsConfigDto {
  @ApiProperty({ description: 'ID wioski' })
  villageId: string;

  @ApiProperty({ description: 'Nazwa wioski' })
  villageName: string;

  @ApiProperty({ description: 'ID serwera' })
  serverId: number;

  @ApiProperty({ description: 'Czy automatyczne zbieractwo jest włączone dla tej wioski', default: false })
  @IsBoolean()
  isAutoScavengingEnabled: boolean;

  @ApiProperty({ description: 'Konfiguracja jednostek', type: UnitsConfigDto })
  @IsObject()
  @ValidateNested()
  @Type(() => UnitsConfigDto)
  units: UnitsConfigDto;
}

