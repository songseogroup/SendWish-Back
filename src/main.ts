import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import * as express from 'express';
import { json, urlencoded } from 'express';
import { MulterExceptionFilter } from './common/multer-exception.filter';

async function bootstrap() {
  
  const app = await NestFactory.create(AppModule);
  app.use('/auth/webhook', express.raw({ type: 'application/json' }));
  // Enable CORS
  app.enableCors();
  
  // Configure for file uploads
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));
  
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  app.useGlobalFilters(new MulterExceptionFilter());
  const config = new DocumentBuilder()
  .setTitle('Wishful')
  .setDescription('The Wishful API description')
  .setVersion('1.0')
  .addTag('Wishful')
  .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(3000);
}
bootstrap();
