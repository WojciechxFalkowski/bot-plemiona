import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { notificationsProviders } from './notifications.providers';
import { DatabaseModule } from '@/database/database.module';
import { ClerkAuthModule } from '@/clerk-auth/clerk-auth.module';
import { SlackNotificationService } from './slack-notification.service';

@Module({
  imports: [DatabaseModule, ClerkAuthModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, ...notificationsProviders, SlackNotificationService],
  exports: [NotificationsService, SlackNotificationService],
})
export class NotificationsModule { }
