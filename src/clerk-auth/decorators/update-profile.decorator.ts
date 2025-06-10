import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { UpdateProfileDto, UserProfileDto } from '../dto';

export function UpdateProfileDecorators() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Update user profile',
      description: 'Update user game-related information (nick, password, server)',
    }),
    ApiBody({
      type: UpdateProfileDto,
      description: 'User profile update data',
    }),
    ApiResponse({
      status: 200,
      description: 'User profile updated successfully',
      type: UserProfileDto,
    }),
    ApiResponse({
      status: 400,
      description: 'Bad request - Invalid input data',
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