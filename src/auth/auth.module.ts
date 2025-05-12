import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ClassSerializerInterceptor } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersService } from 'src/users/users.service';
import { UsersModule } from 'src/users/users.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import {oauth2ClientProvider} from './oauth.provider'
import { Auth } from './entities/auth.entity';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { JwtStrategy } from './strategies/jwt.strategy';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports:[
    TypeOrmModule.forFeature([Auth,User]),
    MulterModule.register({
      dest: './uploads',
    }),
    UsersModule,
    ConfigModule.forRoot(),
  ],

  controllers: [AuthController],
  providers: [AuthService,UsersService,oauth2ClientProvider,{
    provide: APP_INTERCEPTOR,
    useClass: ClassSerializerInterceptor,
  }, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
