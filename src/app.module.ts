var dotenvExpand = require('dotenv-expand');
export const myENV = require('dotenv').config();
var parse = require('pg-connection-string').parse;
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
import { ScheduleModule } from "@nestjs/schedule";

@Module({
  imports: [

    ConfigModule.forRoot(),
    TypeOrmModule.forRoot({ ...typeOrmConfig, autoLoadEntities: true }),

    ScheduleModule.forRoot(),

    MailerModule.forRoot({
      transport: {
        service: 'Gmail',
        auth: {
          user: process.env.MY_EMAIL,
          pass: process.env.EMAIL_PASS,
        },
      },
      defaults: {
        from: process.env.MY_EMAIL,
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
    CronJobsModule

  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    }
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(LoggerMiddleware)
      .exclude(
        {
          path: '/api', method: RequestMethod.ALL
        },
        { path: '/auth/sign-up', method: RequestMethod.POST },
        { path: '/auth/login', method: RequestMethod.POST },
        { path: '/auth/forgot-password', method: RequestMethod.POST },
        { path: "/", method: RequestMethod.ALL }
      ).forRoutes('*');
  }
}
