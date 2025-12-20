import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

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
}
