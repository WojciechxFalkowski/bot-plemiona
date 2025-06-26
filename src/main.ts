import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { SettingsService } from './settings/settings.service';
import { SettingsKey } from './settings/settings-keys.enum';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

  app.enableCors();

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
  }));

  // Swagger -> https://docs.nestjs.com/openapi/introduction
  const config = new DocumentBuilder()
    .setTitle('Plemiona Scavenging Bot API')
    .setDescription('API for controlling the Plemiona scavenging bot')
    .setVersion('1.0')
    .addTag('Scavenging Bot')
    .addTag('Settings')
    .build()
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document); ///api-json -> export to postman json


  // Optional: Seed initial data if not already present
  const settingsService = app.get(SettingsService);

  // Seed Plemiona cookies
  const existingCookies = await settingsService.getSetting(SettingsKey.PLEMIONA_COOKIES);
  if (!existingCookies) {
    // Example cookies data - this should be replaced with real cookies via the API
    const initialCookies = [
      {
        name: 'pl_auth',
        value: 'd10f35ddd864:c449c0dffdf525d354be8b618cb73de0e1c42b42f388623341cb5c2ae2bce504',
        domain: '.plemiona.pl',
        path: '/',
        expires: Math.floor(new Date('2025-05-30T14:46:32.623Z').getTime() / 1000),
      },
      {
        name: 'cid',
        value: '113995269',
        domain: '.plemiona.pl',
        path: '/',
        expires: Math.floor(new Date('2026-04-30T14:46:28.090Z').getTime() / 1000),
      },
      {
        name: 'sid',
        value: '0%3Abba1c87a4d77b774238cfdde1ddf8c8b426c1a4416e0f0f375d2c7edaa23202126cb0af5fbe1e0fc7143bfd36637a86e614391359155067522dcfdcd80bbaf7f',
        domain: 'pl216.plemiona.pl',
        path: '/',
        expires: -1,
      },
      {
        name: 'global_village_id',
        value: '12142',
        domain: 'pl216.plemiona.pl',
        path: '/',
        expires: -1,
      },
    ];

    await settingsService.setSetting(SettingsKey.PLEMIONA_COOKIES, initialCookies);
    console.log('Initial Plemiona cookies data seeded');
  }

  // Seed auto-scavenging setting
  const autoScavengingSettings = await settingsService.getSetting(SettingsKey.AUTO_SCAVENGING_ENABLED);
  if (!autoScavengingSettings) {
    // Default to disabled
    await settingsService.setSetting(SettingsKey.AUTO_SCAVENGING_ENABLED, { value: false });
    console.log('Initial auto-scavenging setting seeded (disabled by default)');
  }

  await app.listen(process.env.BACKEND_PORT || 3000);
}

bootstrap();