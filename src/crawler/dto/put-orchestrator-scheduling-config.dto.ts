import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

/** Single task patch (minutes); all fields optional */
export class OrchestratorSchedulingTaskPatchDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    initialMinutes?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    repeatMinMinutes?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    repeatMaxMinutes?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    repeatFixedMinutes?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    massScavengingJitterMaxSeconds?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    onEnableMinutes?: number;
}

/**
 * Partial map of task keys to patches (PUT body).
 */
export class PutOrchestratorSchedulingConfigDto {
    @ApiPropertyOptional({ type: () => OrchestratorSchedulingTaskPatchDto })
    @IsOptional()
    @ValidateNested()
    @Type(() => OrchestratorSchedulingTaskPatchDto)
    constructionQueue?: OrchestratorSchedulingTaskPatchDto;

    @ApiPropertyOptional({ type: () => OrchestratorSchedulingTaskPatchDto })
    @IsOptional()
    @ValidateNested()
    @Type(() => OrchestratorSchedulingTaskPatchDto)
    scavenging?: OrchestratorSchedulingTaskPatchDto;

    @ApiPropertyOptional({ type: () => OrchestratorSchedulingTaskPatchDto })
    @IsOptional()
    @ValidateNested()
    @Type(() => OrchestratorSchedulingTaskPatchDto)
    massScavenging?: OrchestratorSchedulingTaskPatchDto;

    @ApiPropertyOptional({ type: () => OrchestratorSchedulingTaskPatchDto })
    @IsOptional()
    @ValidateNested()
    @Type(() => OrchestratorSchedulingTaskPatchDto)
    miniAttacks?: OrchestratorSchedulingTaskPatchDto;

    @ApiPropertyOptional({ type: () => OrchestratorSchedulingTaskPatchDto })
    @IsOptional()
    @ValidateNested()
    @Type(() => OrchestratorSchedulingTaskPatchDto)
    playerVillageAttacks?: OrchestratorSchedulingTaskPatchDto;

    @ApiPropertyOptional({ type: () => OrchestratorSchedulingTaskPatchDto })
    @IsOptional()
    @ValidateNested()
    @Type(() => OrchestratorSchedulingTaskPatchDto)
    armyTraining?: OrchestratorSchedulingTaskPatchDto;

    @ApiPropertyOptional({ type: () => OrchestratorSchedulingTaskPatchDto })
    @IsOptional()
    @ValidateNested()
    @Type(() => OrchestratorSchedulingTaskPatchDto)
    twDatabase?: OrchestratorSchedulingTaskPatchDto;

    @ApiPropertyOptional({ type: () => OrchestratorSchedulingTaskPatchDto })
    @IsOptional()
    @ValidateNested()
    @Type(() => OrchestratorSchedulingTaskPatchDto)
    accountManager?: OrchestratorSchedulingTaskPatchDto;
}
