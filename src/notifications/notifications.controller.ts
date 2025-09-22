import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { RegisterFcmDto } from './dto/register-fcm.dto';
import { SendNotificationDto } from './dto/send-notification.dto';
import { ClerkAuthGuard } from '../clerk-auth/guards/clerk-auth.guard';
import { AuthUser } from '../clerk-auth/decorators/auth-user.decorator';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('register')
  @UseGuards(ClerkAuthGuard)
  @HttpCode(HttpStatus.OK)
  async register(
    @Body() registerFcmDto: RegisterFcmDto,
    @AuthUser() authUser: { id: string },
  ): Promise<{ message: string }> {
    await this.notificationsService.registerToken(registerFcmDto.token, authUser.id);
    return { message: 'Token registered successfully' };
  }
 
  @Post('unregister')
  @UseGuards(ClerkAuthGuard)
  @HttpCode(HttpStatus.OK)
  async unregister(
    @Body() registerFcmDto: RegisterFcmDto,
  ): Promise<{ message: string }> {
    await this.notificationsService.unregisterToken(registerFcmDto.token);
    return { message: 'Token unregistered successfully' };
  }

  @Post('send')
  @HttpCode(HttpStatus.OK)
  async send(@Body() sendNotificationDto: SendNotificationDto): Promise<{ message: string }> {
    const { token, title, body } = sendNotificationDto;
    await this.notificationsService.sendNotification(token, title, body);
    return { message: 'Notification sent successfully' };
  }
}
