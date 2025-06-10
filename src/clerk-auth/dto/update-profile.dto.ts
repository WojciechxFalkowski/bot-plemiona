import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

/**
 * DTO for updating user profile information
 */
export class UpdateProfileDto {
  @ApiProperty({
    example: 'PlayerNick',
    description: 'Game nickname',
    required: false,
  })
  @IsOptional()
  @IsString()
  gameNick?: string;

  @ApiProperty({
    example: 'myGamePassword123',
    description: 'Game password',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  gamePassword?: string;

  @ApiProperty({
    example: 'game-server-1',
    description: 'Game server name',
    required: false,
  })
  @IsOptional()
  @IsString()
  gameServer?: string;
} 