import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as admin from 'firebase-admin';
import { ServiceAccount } from 'firebase-admin';
import { FcmTokenEntity } from './entities/fcm-token.entity';
import { NOTIFICATIONS_ENTITY_REPOSITORY } from './player-villages.contracts';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @Inject(NOTIFICATIONS_ENTITY_REPOSITORY)
    private readonly fcmTokenRepository: Repository<FcmTokenEntity>,
  ) {
    const serviceAccount: ServiceAccount = require('../../../plemiona-bot-notifica-220925-firebase-adminsdk-fbsvc-53d07b8d62.json');
    if (!serviceAccount) {
      this.logger.error('Service account not found');
      throw new Error('Service account not found');
    }

    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      this.logger.log('Firebase Admin initialized');
    }
  }

  async registerToken(token: string, userId: string): Promise<void> {
    this.logger.log(`Registering FCM token for user ${userId}`);
    const existingToken = await this.fcmTokenRepository.findOne({ where: { token } });

    if (existingToken) {
      this.logger.log(`Token already exists for user ${existingToken.userId}. Updating owner.`);
      existingToken.userId = userId;
      await this.fcmTokenRepository.save(existingToken);
      return;
    }

    const newToken = this.fcmTokenRepository.create({ token, userId });
    await this.fcmTokenRepository.save(newToken);
    this.logger.log(`Token registered successfully for user ${userId}`);
  }

  async unregisterToken(token: string): Promise<void> {
    this.logger.log(`Unregistering FCM token: ${token}`);
    await this.fcmTokenRepository.delete({ token });
    this.logger.log(`Token unregistered successfully`);
  }

  async sendNotification(token: string, title: string, body: string): Promise<void> {
    this.logger.log(`Sending notification to ${token}: ${title} - ${body}`);

    const message: admin.messaging.Message = {
      notification: {
        title,
        body,
      },
      token: token,
    };

    try {
      const response = await admin.messaging().send(message);
      this.logger.log('Successfully sent message:', response);
    } catch (error) {
      this.logger.error('Error sending message:', error);
      if (error.code === 'messaging/registration-token-not-registered') {
        this.logger.log(`Token ${token} is not registered. Removing from DB.`);
        await this.unregisterToken(token);
      }
    }
  }
}
