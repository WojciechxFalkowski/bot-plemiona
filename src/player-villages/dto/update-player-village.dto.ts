import { IsString, IsNumber, IsBoolean, IsOptional, IsInt, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdatePlayerVillageDto {
    @ApiProperty({ description: 'Nazwa wioski', required: false })
    @IsOptional()
    @IsString()
    name?: string;

    @ApiProperty({ description: 'Właściciel wioski', required: false })
    @IsOptional()
    @IsString()
    owner?: string;

    @ApiProperty({ description: 'Plemię', required: false })
    @IsOptional()
    @IsString()
    tribe?: string;

    @ApiProperty({ description: 'Punkty wioski', required: false })
    @IsOptional()
    @IsInt()
    @Min(0)
    points?: number;

    @ApiProperty({ description: 'Czy można atakować', required: false })
    @IsOptional()
    @IsBoolean()
    canAttack?: boolean;
}
