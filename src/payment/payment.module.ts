import { Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { EventsService } from 'src/events/events.service';
import { UsersService } from 'src/users/users.service';
import { PaymentController } from './payment.controller';
import { Event } from 'src/events/entities/event.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/users/entities/user.entity';
import { Payment } from './entities/payment.entity';
import { S3Service } from 'src/utils/s3.service';
import { ConfigService } from '@nestjs/config';
@Module({
  imports:[TypeOrmModule.forFeature([Event,Payment,User])],
  controllers: [PaymentController],
  providers: [PaymentService, EventsService, UsersService,S3Service,ConfigService], 
})
export class PaymentModule {}
