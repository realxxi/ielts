import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './modules';
import { json, urlencoded } from 'express';

async function bootstrap() {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) throw new Error('JWT_SECRET env o‘zgaruvchisi kamida 32 belgidan iborat bo‘lishi kerak.');
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ extended: true, limit: '10mb' }));
  app.setGlobalPrefix('api');
  app.enableCors({ origin: process.env.WEB_ORIGIN?.split(',') || true, credentials: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  const config = new DocumentBuilder().setTitle('Tilshunos API').setDescription('Til o‘rganish platformasi REST API').setVersion('1.0').addBearerAuth().build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, config));
  await app.listen(process.env.PORT || 4000);
}
bootstrap();
