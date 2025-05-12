const dotenvExpand = require('dotenv-expand');
export const myENV = require('dotenv').config();
const parse = require('pg-connection-string').parse;
export const myvalue = dotenvExpand.expand(myENV).parsed;
export const connectionOptions = parse(process.env.POSTGRES_URL);
import { Module, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { typeOrmConfig } from './config/typeorm.config';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { PaymentModule } from './payment/payment.module';
import { MailerModule } from '@nestjs-modules/mailer';
import { LoggerMiddleware } from './common/middleware/login.middleware';
import { RolesGuard } from './common/guard/roles.guard';
import { APP_GUARD } from '@nestjs/core';
import { EventsModule } from './events/events.module';
import { MulterModule } from '@nestjs/platform-express';
import { CronJobsModule } from './cron-jobs/cron-jobs.module';
import { ScheduleModule } from '@nestjs/schedule';
import { ChatGptService } from './chatgpt/Chatgpt.service'; // Import the service
import { ChatgptModule } from './chatgpt/Chatgpt.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({ ...typeOrmConfig, autoLoadEntities: true }),

    ScheduleModule.forRoot(),

    MailerModule.forRoot({
      transport: {
        host: 'smtp.office365.com',
        port: 587,
        secure: false,
        auth: {
          user: process.env.MY_EMAIL,
          pass: process.env.EMAIL_PASS,
        },
        tls: {
          ciphers: 'SSLv3',
          rejectUnauthorized: false
        },
        debug: true, // Enable debug logs
        logger: true, // Enable logger
      },
      defaults: {
        from: '"Sendwish" <info@sendwish.org>',
      },
    }),
    MulterModule.register({
      dest: './assets', // Specify the destination folder
      limits: {
        files: 5, // Maximum number of files
      },
    }),
    UsersModule,
    AuthModule,
    EventsModule,
    PaymentModule,
    CronJobsModule,
    ChatgptModule
  ],
  controllers: [AppController],
  providers: [
    AppService,
    ChatGptService,
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(LoggerMiddleware) // Apply the middleware
      .exclude(
        { path: 'auth/login', method: RequestMethod.POST },
        {
          path: '/api',
          method: RequestMethod.ALL,
        },
        {path:'auth/google',method:RequestMethod.POST},
        {path:'auth/google/redirect',method:RequestMethod.ALL},
        { path: 'auth/sign-up', method: RequestMethod.POST },
        { path: 'auth/forgot-password', method: RequestMethod.POST },
        {path:'/events/:id([0-9]+)',method:RequestMethod.GET},
        {path:'/events/createPaymentIntent/:id',method:RequestMethod.PUT},
        {path:'/chatgpt/generate-message',method:RequestMethod.POST},
        {path:"/payment",method:RequestMethod.POST
        },
        { path: '/', method: RequestMethod.ALL },

      ) // Exclude /auth/login route
      .forRoutes('*'); // Apply to all other routes
  }
}
