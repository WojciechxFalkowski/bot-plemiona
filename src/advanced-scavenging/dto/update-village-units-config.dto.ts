import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsObject, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

class UpdateUnitsConfigDto {
  @ApiProperty({ description: 'Czy pikinierzy mają brać udział w zbieractwie', required: false })
  @IsBoolean()
  @IsOptional()
  spear?: boolean;

  @ApiProperty({ description: 'Czy miecznicy mają brać udział w zbieractwie', required: false })
  @IsBoolean()
  @IsOptional()
  sword?: boolean;

  @ApiProperty({ description: 'Czy topornicy mają brać udział w zbieractwie', required: false })
  @IsBoolean()
  @IsOptional()
  axe?: boolean;

  @ApiProperty({ description: 'Czy łucznicy mają brać udział w zbieractwie', required: false })
  @IsBoolean()
  @IsOptional()
  archer?: boolean;

  @ApiProperty({ description: 'Czy lekka kawaleria ma brać udział w zbieractwie', required: false })
  @IsBoolean()
  @IsOptional()
  light?: boolean;

  @ApiProperty({ description: 'Czy konni łucznicy mają brać udział w zbieractwie', required: false })
  @IsBoolean()
  @IsOptional()
  marcher?: boolean;

  @ApiProperty({ description: 'Czy ciężka kawaleria ma brać udział w zbieractwie', required: false })
  @IsBoolean()
  @IsOptional()
  heavy?: boolean;
}

export class UpdateVillageUnitsConfigDto {
  @ApiProperty({ description: 'Konfiguracja jednostek', type: UpdateUnitsConfigDto, required: false })
  @IsObject()
  @ValidateNested()
  @Type(() => UpdateUnitsConfigDto)
  @IsOptional()
  units?: UpdateUnitsConfigDto;
}

