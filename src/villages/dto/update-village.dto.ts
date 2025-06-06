import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateVillageDto {
    @IsOptional()
    @IsBoolean()
    isAutoBuildEnabled?: boolean;

    @IsOptional()
    @IsBoolean()
    isAutoScavengingEnabled?: boolean;
} 