import { IsString, IsBoolean, IsOptional } from 'class-validator';

export class CreateVillageDto {
    @IsString()
    id: string;

    @IsString()
    name: string;

    @IsString()
    coordinates: string;

    @IsOptional()
    @IsBoolean()
    isAutoBuildEnabled?: boolean;

    @IsOptional()
    @IsBoolean()
    isAutoScavengingEnabled?: boolean;
} 