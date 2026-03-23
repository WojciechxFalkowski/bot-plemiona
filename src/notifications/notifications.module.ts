import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { SlackNotificationService } from './slack-notification.service';

@Module({
  controllers: [NotificationsController],
  providers: [SlackNotificationService],
  exports: [SlackNotificationService],
})
export class NotificationsModule { }
