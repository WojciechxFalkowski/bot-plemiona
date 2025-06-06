import { IsBoolean } from 'class-validator';

export class UpdateAutoScavengingDto {
    @IsBoolean()
    isAutoScavengingEnabled: boolean;
}

export class UpdateAutoBuildDto {
    @IsBoolean()
    isAutoBuildEnabled: boolean;
} 