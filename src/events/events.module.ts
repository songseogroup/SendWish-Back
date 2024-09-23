import { Module } from '@nestjs/common';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';
import { User } from 'src/users/entities/user.entity';
import { Event } from './entities/event.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from 'src/users/users.service';
import { Payment } from 'src/payment/entities/payment.entity';
import { PaymentService } from 'src/payment/payment.service';
import { S3Service } from 'src/utils/s3.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports:[TypeOrmModule.forFeature([User,Event,Payment]),
  ConfigModule],
  controllers: [EventsController],
  providers: [EventsService,UsersService,PaymentService,S3Service],
})
export class EventsModule {}
