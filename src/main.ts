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
  SwaggerModule.setup('api', app, document);///api-json -> export to postman json


  await app.listen(process.env.BACKEND_PORT || 3000);
}

bootstrap();