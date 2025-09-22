import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { verifyToken } from '@clerk/clerk-sdk-node';
import { Repository } from 'typeorm';
import { UserEntity } from '../user.entity';
import { USER_ENTITY_REPOSITORY } from '../clerk-auth.service.contracts';

import { ClerkAuthService } from '../clerk-auth.service';

@Injectable()
export class ClerkAuthGuard implements CanActivate {
  constructor(
    private readonly configService: ConfigService,
    @Inject(ClerkAuthService)
    private readonly clerkAuthService: ClerkAuthService,
  ) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    try {
      // Verify token with Clerk
      const clerkSecretKey = this.configService.get<string>('CLERK_SECRET_KEY');
      if (!clerkSecretKey) {
        throw new UnauthorizedException('CLERK_SECRET_KEY is not set in environment variables');
      }

      const payload = await verifyToken(token, {
        secretKey: clerkSecretKey,
      });

      const user = await this.clerkAuthService.findOrCreateUser(payload.sub as string);

      request.user = user;
      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid token ' + error.message);
    }
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}