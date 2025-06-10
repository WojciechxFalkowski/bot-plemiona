import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for token verification response
 */
export class TokenVerificationDto {
  @ApiProperty({
    example: true,
    description: 'Whether the token is valid',
  })
  valid: boolean;

  @ApiProperty({
    example: 'user_2abc123def456',
    description: 'Clerk user identifier if token is valid',
    required: false,
  })
  clerkUserId?: string;

  @ApiProperty({
    example: 'user@example.com',
    description: 'User email if token is valid',
    required: false,
  })
  email?: string;
} 