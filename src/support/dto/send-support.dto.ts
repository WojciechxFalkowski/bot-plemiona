import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
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
    description: 'Liczba pikinierów do wysłania z tej wioski',
    example: 500,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  spearToSend!: number;

  @ApiProperty({
    description: 'Liczba mieczników do wysłania z tej wioski',
    example: 500,
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  swordToSend!: number;
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
    description: 'Rozmiar paczki (jednostek na paczkę)',
    example: 100,
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  packageSize!: number;

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

