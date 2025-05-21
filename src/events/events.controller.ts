import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode, Req, ClassSerializerInterceptor, UseInterceptors, Put, UploadedFiles, UploadedFile, UseGuards } from '@nestjs/common';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { Request } from 'express';
import { CreatePaymentEventDto } from   '../payment/dto/create-payment.dto';
import { Role } from 'src/common/role.enum';
import { Roles } from 'src/common/roles.decorator';
import { ApiResponse } from '@nestjs/swagger';
import { TEvent } from 'src/interfaces/event.types';
import { EventClass } from './classes/event.class';
import { CreateGiftDto } from 'src/payment/dto/create-payment-intent.dto';
import { stripeIntentClass } from 'src/payment/classes/payment-create.class';
import {  FileInterceptor } from '@nestjs/platform-express';
import { PaymentService } from 'src/payment/payment.service';
import { S3Service } from 'src/utils/s3.service';
import { User } from '../users/entities/user.entity';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guard/roles.guard';

@Controller('events')
@UseInterceptors(ClassSerializerInterceptor)
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class EventsController {
  constructor(
    private readonly eventsService: EventsService,
    private readonly paymentService: PaymentService,
    private readonly s3Service: S3Service
  ) {}

  /**
 * Creates a new event.
 *
 * @param {CreateEventDto} createEventDto - The data for the new event.
 * @return {Promise} The newly created event data.
 */
  @Post()
  @HttpCode(201)
  @Roles(Role.User)
  @UseInterceptors(
    FileInterceptor('image'))
  async create(@UploadedFile()
  file: Express.Multer.File, @Body() createEventDto: CreateEventDto ) {

      const image = await this.s3Service.uploadDocument(file);
      createEventDto.image = image
    return this.eventsService.create(createEventDto);
  }
    /**
   * Updates an existing event.
   *
   * @param {string} id - The ID of the event to be updated.
   * @param {UpdateEventDto} updateEventDto - The updated event data.
   * @return {Promise} The updated event data.
   */

  @Patch(':id')
  @HttpCode(201)
  @Roles(Role.User)  
  @UseInterceptors(
    FileInterceptor('image'))
  async update(@Param('id') id: string, @UploadedFile()
  file: Express.Multer.File, @Body() updateEventDto: UpdateEventDto) {
    if(file){
    const image = await this.s3Service.uploadDocument(file);
    updateEventDto.image = image}
    return this.eventsService.update(+id, updateEventDto);
  }

  @Get()
  @Roles(Role.User)
  findAll() {
    return this.eventsService.findAll();
  }

  // get all events of a user
  @Get('my-events')
  @Roles(Role.User)
  async findMyEvents(@Req() request: Request & { user: User }) {
    const user = request.user;
    const {id} = user
    return this.eventsService.findByUser(id);
  }

//  this is is of event
  @Put('createPaymentIntent/:id')
  @Roles(Role.User)
  @HttpCode(201)
  @ApiResponse({
    description: "Success",
    type:  stripeIntentClass, 
    status: 200
  })
  async createPaymentIntent(@Param('id') id: number, @Req() request: Request,@Body () body:CreateGiftDto) {
    
    return this.eventsService.createPaymentIntent(id,body);
  }
//   @Put('createPaymentIntent/:id')
// @Roles(Role.User)
// @HttpCode(201)
// @ApiResponse({
//   description: "Success",
//   type: stripeIntentClass, 
//   status: 200
// })
// async createPaymentIntent(
//   @Param('id') id: number,
//   @Req() request: Request,
//   @Body() body: CreateGiftDto
// ) {
//   const { gift_amount } = body; // Extract giftAmount from the body
//   return this.eventsService.createPaymentIntent(id, gift_amount); // Pass id and gift_amount separately
// }
  /**
   * Finds all payments made against an event
   * @param id The ID of the event to find payments for
   * @returns An array of payments made against the event
   */

  @Get(':id/list-payments')
  @Roles(Role.User)
  @HttpCode(200)
  @ApiResponse({
    description: "Successfully got all payments against event",
    status: 200
  })
  async findAllPaymentsForEvent(@Param('id') id: number) {
    return this.paymentService.findAllPaymentsForEvent(id);
  }


  @Get(':id')
  @Roles(Role.User)
  @HttpCode(200)
  @ApiResponse({
    description: "Success",
    type: EventClass,
    status: 200
  })
  findOne(@Param('id') id: string) {
    return this.eventsService.findOne(+id);
  }


  @Delete(':id')
  @Roles(Role.User)
  remove(@Param('id') id: string) {
    return this.eventsService.remove(+id);
  }
}
