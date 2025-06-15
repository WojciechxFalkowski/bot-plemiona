import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../database/database.module';
import { ClerkAuthController } from './clerk-auth.controller';
import { ClerkAuthService } from './clerk-auth.service';
import { ClerkAuthGuard } from './guards/clerk-auth.guard';
import { clerkAuthProviders } from './clerk-auth.service.providers';
import { SettingsModule } from '@/settings/settings.module';

@Module({
  imports: [DatabaseModule, ConfigModule, SettingsModule],
  controllers: [ClerkAuthController],
  providers: [...clerkAuthProviders, ClerkAuthService, ClerkAuthGuard],
  exports: [ClerkAuthService, ClerkAuthGuard],
})
export class ClerkAuthModule { } 