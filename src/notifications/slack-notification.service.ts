import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SlackNotificationService {
    private readonly logger = new Logger(SlackNotificationService.name);
    private readonly webhookUrl = 'https://slack.com/api/chat.postMessage';

    constructor(private readonly configService: ConfigService) { }

    async sendRecaptchaAlert(params: { serverId: number; accountName?: string; operationType?: string }): Promise<void> {
        const token = this.configService.get<string>('SLACK_BOT_TOKEN');
        const channel = this.configService.get<string>('SLACK_ALERTS_CHANNEL');

        if (!token || !channel) {
            this.logger.debug('Skipping Slack notification due to missing configuration (SLACK_BOT_TOKEN or SLACK_ALERTS_CHANNEL).');
            return;
        }

        const { serverId, accountName, operationType } = params;
        const accountStr = accountName ? `dla konta *${accountName}* ` : '';
        const operationStr = operationType ? `podczas operacji: *${operationType}*` : '';

        const text = `🚨 *Wykryto reCAPTCHA!* 🚨\n\nBot natrafił na blokadę reCAPTCHA ${accountStr}na serwerze *${serverId}* ${operationStr}.\nZaloguj się ręcznie w przeglądarce i rozwiąż mechanizm, aby kontynuować pracę.`;

        try {
            const response = await fetch(this.webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json; charset=utf-8',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    channel: channel,
                    text: text
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                this.logger.error(`Failed to send Slack notification. Status: ${response.status}, Body: ${errorText}`);
                return;
            }

            const data = await response.json();
            if (!data.ok) {
                this.logger.error(`Slack API returned error: ${data.error}`);
            } else {
                this.logger.log(`Successfully sent Slack notification to ${channel}`);
            }
        } catch (error) {
            this.logger.error('Error sending Slack notification', error);
        }
    }
}
