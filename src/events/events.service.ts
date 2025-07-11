import { forwardRef, HttpException, HttpStatus, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { User } from 'src/users/entities/user.entity';
import { Event } from './entities/event.entity';
import { Repository } from 'typeorm';
import { UsersService } from 'src/users/users.service';
import { PaymentService } from 'src/payment/payment.service';
import { TEvent } from 'src/interfaces/event.types';
import { CreateGiftDto } from 'src/payment/dto/create-payment-intent.dto';
import { S3Service } from 'src/utils/s3.service';

let stripe = require('stripe')(process.env.STRIPE_KEY);
@Injectable()
export class EventsService {
  constructor(

    private readonly usersService: UsersService,
    @Inject(forwardRef(() => PaymentService))
    private readonly paymentService: PaymentService,
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly s3Service: S3Service,


  ) { }
  async create(createEventDto: CreateEventDto) {
    try {
      const { userId, ...others } = createEventDto;

      const user = await this.userRepository
        .createQueryBuilder('user')
        .where('user.id = :userId', { userId: userId })
        .getOne();
      console.log(user)
      if (!user) {
        throw new Error('User not found');
      }

      const event = this.eventRepository.create({
        ...others,
        owner: user,
      });

      // Save the event and the user to persist the changes 
      const save_event = await this.eventRepository.save(event);
      return {
        status: 200,
        message: 'Event created',
        data: save_event,
      };
    } catch (e) {
      console.log(e)
      throw new HttpException({
        status: HttpStatus.BAD_REQUEST,
        error: e.message,
      }, HttpStatus.BAD_REQUEST, {
        cause: e
      });;
    }
  }



  async findAll() {
    try {
      const allevent = await this.eventRepository.find();
      const update_events = await Promise.all(allevent.map(async (item: TEvent) => {

        const generateImageUrl = await this.s3Service.generateSignedUrl(item.image)
        item.image = generateImageUrl
        return item
      }))
      return update_events
    } catch (e) {
      throw new HttpException({
        status: HttpStatus.BAD_REQUEST,
        error: e.message,
      }, HttpStatus.BAD_REQUEST, {
        cause: e.message
      });;
    }

  }

  async findByUser(id: number) {
    try {

      const events = await this.eventRepository
        .createQueryBuilder('event')
        .leftJoinAndSelect('event.owner', 'owner')
        .where('owner.id = :id', { id: id })
        .getMany();

      const update_events = await Promise.all(events.map(async (item: TEvent) => {

        const generateImageUrl = await this.s3Service.generateSignedUrl(item.image)
        item.image = generateImageUrl
        return item
      }))
      return { message: "Success", data: update_events, status: 200 }
    } catch (e) {
      throw new HttpException({
        status: HttpStatus.BAD_REQUEST,
        error: e.message,
      }, HttpStatus.BAD_REQUEST, {
        cause: e.message
      });;
    }
  }


  async createPaymentIntent(id: number, body: CreateGiftDto) {
    try {
      const { gift_amount, gift_fee } = body;

      // First get the event to ensure it exists
      const event = await this.eventRepository
        .createQueryBuilder('event')
        .leftJoinAndSelect('event.owner', 'owner')
        .where('event.eid = :id', { id })
        .getOne();
      if (!event) {
        throw new Error('Event not found');
      }

      // Get the event owner's user data
      const user = await this.userRepository.findOne({ where: { id: event.owner.id } });
      if (!user) {
        throw new Error('Event owner not found');
      }

      if (!user.customerStripeAccountId) {
        throw new Error('Event owner does not have a valid Stripe account');
      }

      // Create payment intent with transfer to event owner's connected account
      // Pass null as customer_id to indicate this is an anonymous payment
      const createPayment = await this.paymentService.createPaymentIntent(
        null, // No customer ID for anonymous payments
        id,
        gift_amount,
        gift_fee
      );
      
      return createPayment;
    }
    catch (e) {
      if (e instanceof HttpException && e.getStatus() === 410) {
        throw e;
      }
      throw new HttpException({
        status: HttpStatus.BAD_REQUEST,
        error: e.message,
      }, HttpStatus.BAD_REQUEST, {
        cause: e
      });
    }
  }
  async findOne(id: number): Promise<{
    message: string;
    data: TEvent;
    status: number;
  }> {
    try {

      // const customer = await stripe.customers.list({
      //   email: others.reciever_email,
      //   limit: 1,
      // });

      // // Save the event and the user to persist the changes
      // if (customer.data.length === 0) {
      //   throw new Error("Reciever email is not registerd on our system")
      // }
      const event = await this.eventRepository
        .createQueryBuilder('event')
        .leftJoinAndSelect('event.owner', 'owner')
        .where('event.eid = :id', { id: id })
        .getOne();

      const { amount_collected, ...other } = event;
      other.image = await this.s3Service.generateSignedUrl(other.image)
      if (!event) {
        throw new Error('Event not found');
      }
      return {
        message: "Success",
        data: other,
        status: 200,
      }

    } catch (e) {

      throw new HttpException({
        status: HttpStatus.BAD_REQUEST,
        error: e.message,
      }, HttpStatus.BAD_REQUEST, {
        cause: e
      });

    }
  }

  async update(id: number, updateEventDto: UpdateEventDto): Promise<{ message: string, data: TEvent, status: number }> {
    try {
      // Find the event by ID
      const event = await this.eventRepository.findOne({ where: { eid: id } });
      console.log(updateEventDto)
      if (!event) {
        throw new NotFoundException(`Event with ID ${id} not found`);
      }
      if (updateEventDto.userId) {
        throw new Error('User id cannot be changed');
      }

      // Preserve existing image if no new image is provided
      const imageToUpdate = updateEventDto.image;
      if (!imageToUpdate) {
        delete updateEventDto.image; // Remove image from updateDto to preserve existing image
      }

      // Update the event with the new data
      Object.assign(event, updateEventDto);

      // Save the updated event back to the database
      const updated_event = await this.eventRepository.save(event);
      
      // Generate signed URL for the image before returning
      if (updated_event.image) {
        try {
          updated_event.image = await this.s3Service.generateSignedUrl(updated_event.image);
        } catch (error) {
          console.error('Error generating signed URL for image:', error);
          // If we can't generate a signed URL, we could either:
          // 1. Set image to null/empty string
          // 2. Keep the original key
          // 3. Return a default image URL
          // For now, let's keep the original key to avoid breaking the response
          // updated_event.image = null;
        }
      }
      
      return {
        message: "Success",
        data: updated_event,
        status: 200
      }
    } catch (error) {
      throw new HttpException({
        status: HttpStatus.BAD_REQUEST,
        error: error.message,
      }, HttpStatus.BAD_REQUEST, {
        cause: error
      });
    }

  }

  remove(id: number) {
    return `This action removes a #${id} event`;
  }
}
