import { applyDecorators, UseGuards } from '@nestjs/common';
import { ClerkAuthGuard } from '../guards/clerk-auth.guard';

/**
 * Decorator to protect endpoints with Clerk authentication
 */
export function ClerkAuth() {
  return applyDecorators(
    UseGuards(ClerkAuthGuard),
  );
} 