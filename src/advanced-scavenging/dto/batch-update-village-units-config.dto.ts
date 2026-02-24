import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsObject, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

class BatchUpdateUnitsConfigDto {
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

/**
 * DTO for batch update of units config across all villages on a server
 */
export class BatchUpdateVillageUnitsConfigDto {
  @ApiProperty({ description: 'Konfiguracja jednostek do zastosowania we wszystkich wioskach', type: BatchUpdateUnitsConfigDto })
  @IsObject()
  @ValidateNested()
  @Type(() => BatchUpdateUnitsConfigDto)
  units: BatchUpdateUnitsConfigDto;
}
