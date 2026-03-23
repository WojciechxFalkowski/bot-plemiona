import { Controller, Get } from '@nestjs/common';
import { SlackNotificationService } from './slack-notification.service';

@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly slackNotificationService: SlackNotificationService
  ) { }

  @Get('test-slack')
  async testSlack(): Promise<{ message: string }> {
    await this.slackNotificationService.sendRecaptchaAlert({
      serverId: 999,
      accountName: 'TestKonto',
      operationType: 'Testowanie Postmanem'
    });
    return { message: 'Wezwano wysłanie testowego powiadomienia na Slacka' };
  }
}
