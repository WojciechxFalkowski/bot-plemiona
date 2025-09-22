import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { notificationsProviders } from './notifications.providers';
import { DatabaseModule } from '@/database/database.module';
import { ClerkAuthModule } from '@/clerk-auth/clerk-auth.module';

@Module({
  imports: [DatabaseModule, ClerkAuthModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, ...notificationsProviders],
})
export class NotificationsModule { }
