import { forwardRef, HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { CreatePaymentEventDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment } from './entities/payment.entity';
import { TEvent } from 'src/interfaces/event.types';
import { Event as newEvent } from 'src/events/entities/event.entity';
import { UsersService } from 'src/users/users.service';
import { S3Service } from 'src/utils/s3.service';
import { EventsService } from 'src/events/events.service';
import * as moment from 'moment';
// import {Stripe as stripetype} from 'stripe'
@Injectable()
export class PaymentService {
  private my_stripe;
  constructor(
    private readonly usersService: UsersService,
    private readonly s3Service: S3Service,
    @Inject(forwardRef(() => EventsService))
    private readonly eventsService: EventsService,
    
    @InjectRepository(Event)
    private readonly eventRepository: Repository<newEvent>,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
  ) {
    this.my_stripe = require('stripe')(process.env.STRIPE_KEY);
  }


  async create(createPaymentDto: CreatePaymentEventDto) {
    try {
      let stripeAccount;

      const { eventId, ...others } = createPaymentDto;
      const event = await this.eventRepository
        .createQueryBuilder('event')
        .leftJoinAndSelect('event.owner', 'user')
        .where('event.eid = :eventId', { eventId: eventId })
        .getOne();
      if (!event) {
        throw new Error('Error finding this event');
      }
      if (!event.owner.customerStripeAccountId) {
        throw new Error("User not verified on stripe");
      }
      stripeAccount = event.owner.customerStripeAccountId;

      console.log("event moin", event);
      const paymentIntent = await this.my_stripe.paymentIntents.retrieve(createPaymentDto.paymentIntentId);
      console.log("paymentIntent", paymentIntent);

    
      // Calculate the amount after deducting the platform fee and ensure it's in integer form
      // const transferAmount = Math.floor(others.gift_amount * (1 - 0.02));
      const transferAmount = Math.floor(others.gift_amount);
     
      const payment = this.paymentRepository.create({
        gift_amount: Math.floor(transferAmount),
        gift_fee: parseFloat(others.gift_fee),
        event: event,
        sender: others.userId,
        gift_message: others.gift_message,
        email:others.email,
        country: others.country,
      });

      // Save the event and the user to persist the changes
      await this.paymentRepository.save(payment);
      // update event amount collected
      await this.eventsService.update(eventId, {
        amount_collected: event.amount_collected + transferAmount
      })
    
      return {
        status: 200,
        message: 'Payment created moin',
        data: event,
        amount: transferAmount,
      };

    } catch (e) {
      console.log("ERROR", e);
      throw new HttpException({
        status: HttpStatus.BAD_REQUEST,
        error: e.message,
      }, HttpStatus.BAD_REQUEST, {
        cause: e
      });
    }
  }

  /**
   * Creates a payment intent for a customer to make a gift payment.
   *
   * @param {string|null} customer_id - The ID of the customer making the payment.
   * @param {number} eventId - The ID of the event for which the payment is being made.
   * @param {number} gift_amount - The amount of the gift payment in cents.
   * @param {number} gift_fee - The application fee amount in cents.
   * @return {Promise<{ message: string, status: number, data: { id: string, client_secret: string, customer: string } }>} 
   *   A promise that resolves with an object containing a success message, a status code, 
   *   and the payment intent data, including the ID, client secret, and customer ID.
   */
 
  async createPaymentIntent(
    customer_id: string | null,  // customer_id can be null or omitted
    eventId: number,
    gift_amount: number,
    gift_fee: number
  ): Promise<{ message: string; status: number; data?: { id: string; client_secret: string; customer: string | null, application_fee_amount: number, amount: number } }> {
    try {
      // Input validation
      if (!eventId || !gift_amount || !gift_fee) {
        throw new Error('Missing required parameters: eventId, gift_amount, and gift_fee are required');
      }

      if (gift_amount <= 0 || gift_fee < 0) {
        throw new Error('Invalid amounts: gift_amount must be positive and gift_fee must be non-negative');
      }

      // Check if the event exists in the database
      console.log("[PaymentService] Creating payment intent for:", { eventId, gift_amount, gift_fee });
      
      const check_event = await this.eventRepository
        .createQueryBuilder('event')
        .leftJoinAndSelect('event.owner', 'user')
        .where('event.eid = :eventId', { eventId })
        .getOne();
  
      if (!check_event) {
        throw new Error(`Event not found with ID: ${eventId}`);
      }

      if (!check_event.owner?.customerStripeAccountId) {
        throw new Error(`Event owner (ID: ${check_event.owner?.id}) does not have a valid Stripe account`);
      }
  
      // Check if the event was created within the last 7 days
      const sevenDaysAgo = moment().subtract(7, 'days');
      const eventCreatedAt = moment(check_event.created_at, 'YYYY-MM-DD HH:mm:ss.SSSSSS');
      if (eventCreatedAt.isBefore(sevenDaysAgo)) {
        throw new Error(`Event (ID: ${eventId}) has expired. Created at: ${eventCreatedAt.format()}`);
      }

      // Calculate the total amount to charge (including the application fee)
      const totalAmount = Math.round((gift_amount + gift_fee) * 100); // Convert to cents
      const applicationFeeAmount = Math.round(gift_fee * 100); // Convert to cents

      // Create a payment intent without attaching a customer
      const paymentIntent = await this.my_stripe.paymentIntents.create({
        amount: totalAmount,
        currency: 'AUD',
        automatic_payment_methods: {
          enabled: true,
          allow_redirects: 'never',
        },
        transfer_data: {
          destination: check_event.owner.customerStripeAccountId,
        },
        application_fee_amount: applicationFeeAmount,
      });
    
      // Extract payment intent data to return
      const { client_secret, id, customer, application_fee_amount, amount } = paymentIntent;
      return {
        message: 'Payment intent created successfully',
        status: 200,
        data: { id, client_secret, customer: customer || null, application_fee_amount, amount },
      };
    } catch (error) {
      // Log the full error details for debugging
      console.error('[PaymentService] Payment Intent Creation Error:', {
        error: error,
        stack: error.stack,
        eventId,
        amount: gift_amount,
        fee: gift_fee
      });

      // Throw a more detailed HTTP exception
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          error: error.message,
          details: {
            eventId,
            timestamp: new Date().toISOString(),
            errorType: error.name || 'UnknownError'
          }
        },
        HttpStatus.BAD_REQUEST,
        { cause: error }
      );
    }
  }
  

  // @Interval(24 * 60 * 60 * 1000) // 24 hours in milliseconds
  async clearPayment() {
    try {
      const list_payment = await this.paymentRepository
        .createQueryBuilder('payment')
        .leftJoinAndSelect('payment.event', 'event')
        .getMany();
      console.log(list_payment);
      const paymentCleared = await Promise.all(
        list_payment.length &&
          list_payment.map(
            async (item: {
              pid: number;
              gift_amount: number;
              event: newEvent;
            }) => {
              const current_date = new Date();

              const payment_data = new Date(item.event.date);
              current_date.setHours(0, 0, 0, 0);
              payment_data.setHours(0, 0, 0, 0);

            
              return item;
            },
          ),
      );
      return paymentCleared;
    } catch (e) {
      console.log(e);
      return e;
    }
  }


  async findMyPayments(userId: number) {
    try {
      const payments = await this.paymentRepository
        .createQueryBuilder('payment')
        .innerJoinAndSelect('payment.event', 'event')
        .where('event.userId = :userId', { userId })
        .getMany();

      // Sum all the gift_amount values
      const totalGiftAmount = payments.reduce((sum, payment) => sum + payment.gift_amount, 0);
      
      const paymentSent = await this.paymentRepository
        .createQueryBuilder('payment')
        .where('payment.sender = :userId', { userId })
        .getMany();

      const totalSentGiftAmount = paymentSent.reduce((sum, payment) => sum + payment.gift_amount, 0);

      return {
        message: 'total gift amount',
        data: { totalGiftAmount, totalGifts: payments.length, totalSentGiftAmount, totalSentGifts: paymentSent.length },
        status: 200,
      };

    } catch (e) {
      console.log("ERROR",e);
      throw new HttpException({
        status: HttpStatus.BAD_REQUEST,
        error: e.message,
      }, HttpStatus.BAD_REQUEST, {
        cause: e
      });
    }
  }

  async findAllPaymentsForEvent(id: number) {
    try {
      // Find the event by ID and load related payments
      const payments = await this.paymentRepository.find({
        where: { event: { eid: id } },
      });
    
      return {status:200,data:payments,message:"success"}
    }catch (error) {
      throw new HttpException({
        status: HttpStatus.BAD_REQUEST,
        error: error.message,
      }, HttpStatus.BAD_REQUEST, {
        cause: error
      });
    }
  }



  async findGiftDetailsForReciever(id: number) {
    try {
      // Find the event by ID and load related payments
      const payment = await this.paymentRepository.findOne({
        where: { pid: id },
        relations: ['event'], // Populate event data
      });

      const generateImageUrl = await this.s3Service.generateSignedUrl(payment.event.image);

      delete payment.event.image
      payment.event.image = generateImageUrl;

      return { status: 200, data: payment, message: "success" }

    } catch (error) {
      throw new HttpException({
        status: HttpStatus.BAD_REQUEST,
        error: error.message,
      }, HttpStatus.BAD_REQUEST, {
        cause: error
      });
    }

  }

  findAll() {
    return `This action returns all payment`;
  }

  findOne(id: number) {
    return `This action returns a #${id} payment`;
  }

  update(id: number, updatePaymentDto: UpdatePaymentDto) {
    return `This action updates a #${id} payment`;
  }

  remove(id: number) {
    return `This action removes a #${id} payment`;
  }
}
