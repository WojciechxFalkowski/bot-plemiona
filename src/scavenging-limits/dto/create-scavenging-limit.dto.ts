import { IsInt, IsString, Min, IsOptional } from 'class-validator';

export class CreateScavengingLimitDto {
    @IsInt()
    serverId: number;

    @IsString()
    villageId: string;

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
