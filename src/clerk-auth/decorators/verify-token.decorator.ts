import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { TokenVerificationDto } from '../dto';

export function VerifyTokenDecorators() {
  return applyDecorators(
    ApiBearerAuth(),
    ApiOperation({
      summary: 'Verify JWT token',
      description: 'Verify if the provided JWT token is valid and return user information',
    }),
    ApiResponse({
      status: 200,
      description: 'Token verification result',
      type: TokenVerificationDto,
    }),
    ApiResponse({
      status: 401,
      description: 'Unauthorized - Invalid or missing JWT token',
    }),
  );
} 