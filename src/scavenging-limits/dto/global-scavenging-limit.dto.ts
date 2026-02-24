import { IsInt, Min, IsOptional } from 'class-validator';

/**
 * DTO for creating or updating global scavenging limit (applies to all villages without own limit)
 */
export class GlobalScavengingLimitDto {
    @IsOptional()
    @IsInt()
    @Min(0)
    maxSpearUnits?: number | null;

    @IsOptional()
    @IsInt()
    @Min(0)
    maxSwordUnits?: number | null;

    @IsOptional()
    @IsInt()
    @Min(0)
    maxAxeUnits?: number | null;

    @IsOptional()
    @IsInt()
    @Min(0)
    maxArcherUnits?: number | null;

    @IsOptional()
    @IsInt()
    @Min(0)
    maxLightUnits?: number | null;

    @IsOptional()
    @IsInt()
    @Min(0)
    maxMarcherUnits?: number | null;

    @IsOptional()
    @IsInt()
    @Min(0)
    maxHeavyUnits?: number | null;
}
