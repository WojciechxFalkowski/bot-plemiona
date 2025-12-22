import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class ImportAttackPlanDto {
  @ApiProperty({
    description: 'Server ID for which the attacks should be scheduled',
    type: Number,
  })
  @IsNumber()
  @IsNotEmpty()
  serverId!: number;

  @ApiProperty({
    description: 'Raw attack plan text copied from the Tribal Wars forum (BBCode allowed).',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  rawPlan!: string;

  @ApiProperty({
    description: 'Skip duplicate attacks if they already exist (default: true)',
    type: Boolean,
    required: false,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  skipDuplicates?: boolean = true;
}
