import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO representing user profile information
 */
export class UserProfileDto {
  @ApiProperty({
    example: 1,
    description: 'Unique identifier of the user',
  })
  id: number;

  @ApiProperty({
    example: 'user_2abc123def456',
    description: 'Clerk user identifier',
  })
  clerkUserId: string;

  @ApiProperty({
    example: 'user@example.com',
    description: 'User email address',
  })
  email: string;

  @ApiProperty({
    example: 'PlayerNick',
    description: 'Game nickname',
    required: false,
  })
  gameNick?: string;

  @ApiProperty({
    example: 'game-server-1',
    description: 'Game server name',
    required: false,
  })
  gameServer?: string;

  @ApiProperty({
    example: '2025-01-01T00:00:00.000Z',
    description: 'Account creation date',
  })
  createdAt: Date;

  @ApiProperty({
    example: '2025-01-01T00:00:00.000Z',
    description: 'Last update date',
  })
  updatedAt: Date;
} 