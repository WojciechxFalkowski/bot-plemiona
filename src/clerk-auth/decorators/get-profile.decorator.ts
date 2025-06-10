import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UserProfileDto } from '../dto';

export function GetProfileDecorators() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Get user profile',
      description: 'Retrieve the authenticated user profile information',
    }),
    ApiResponse({
      status: 200,
      description: 'User profile retrieved successfully',
      type: UserProfileDto,
    }),
    ApiResponse({
      status: 401,
      description: 'Unauthorized - Invalid or missing JWT token',
    }),
    ApiResponse({
      status: 404,
      description: 'User not found',
    }),
  );
} 