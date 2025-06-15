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
import { SettingsService } from '@/settings/settings.service';
import { SettingsKey } from '@/settings/settings-keys.enum';

@Injectable()
export class ClerkAuthGuard implements CanActivate {
  constructor(
    private readonly configService: ConfigService,
    @Inject(USER_ENTITY_REPOSITORY)
    private readonly userRepository: Repository<UserEntity>,
    private readonly settingsService: SettingsService,
  ) { }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    try {
      // Verify token with Clerk
      const clerkSecretKey = await this.settingsService.getSetting<{ value: string }>(SettingsKey.CLERK_SECRET_KEY);
      if (!clerkSecretKey || !clerkSecretKey.value) {
        throw new UnauthorizedException('CLERK_SECRET_KEY is not set');
      }
      const payload = await verifyToken(token, {
        secretKey: clerkSecretKey.value,
      });

      // Find or create user in database
      let user = await this.userRepository.findOne({
        where: { clerkUserId: payload.sub },
      });

      if (!user) {
        // Create new user if doesn't exist
        user = this.userRepository.create({
          clerkUserId: payload.sub as string,
          email: (payload.email as string) || '',
        });
        await this.userRepository.save(user);
      }

      // Attach user to request
      request.user = user;
      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
} 