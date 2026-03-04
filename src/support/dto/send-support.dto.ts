import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

/**
 * DTO for a single village allocation in the support dispatch
 */
export class VillageAllocationDto {
  @ApiProperty({
    description: 'Nazwa wioski źródłowej',
    example: '0001 Główna',
  })
  @IsString()
  @IsNotEmpty()
  villageName!: string;

  @ApiProperty({
    description: 'ID wioski źródłowej',
    example: '26972',
  })
  @IsString()
  @IsNotEmpty()
  villageId!: string;

  @ApiProperty({
    description: 'Współrzędne wioski źródłowej',
    example: '549|582',
  })
  @IsString()
  @IsNotEmpty()
  coordinates!: string;

  @ApiProperty({
    description: 'Liczba paczek przydzielonych z tej wioski',
    example: 5,
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  packagesFromVillage!: number;

  @ApiProperty({
    description: 'Słownik jednostek do wysłania z tej wioski',
    example: { spear: 500, sword: 500 },
  })
  @IsObject()
  @IsNotEmpty()
  unitsToSend!: Record<string, number>;
}

/**
 * DTO for the send support request
 */
export class SendSupportDto {
  @ApiProperty({
    description: 'ID serwera',
    example: 218,
  })
  @IsNumber()
  @IsNotEmpty()
  serverId!: number;

  @ApiProperty({
    description: 'ID wioski docelowej (z URL: target=X)',
    example: 30707,
  })
  @IsNumber()
  @IsNotEmpty()
  targetVillageId!: number;

  @ApiProperty({
    description: 'Lista przydziałów wojska z poszczególnych wiosek',
    type: [VillageAllocationDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VillageAllocationDto)
  allocations!: VillageAllocationDto[];

  @ApiProperty({
    description: 'Całkowita liczba paczek do wysłania',
    example: 50,
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  totalPackages!: number;

  @ApiProperty({
    description: 'Konfiguracja jednostek w paczce (jednostek na paczkę)',
    example: { spear: 50, sword: 50 },
  })
  @IsObject()
  @IsNotEmpty()
  packageUnits!: Record<string, number>;

  @ApiProperty({
    description: 'Czy uruchomić przeglądarkę w trybie headless (bez okna). Domyślnie true.',
    example: true,
    required: false,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  headless?: boolean;
}

