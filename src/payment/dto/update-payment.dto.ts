import { PartialType } from '@nestjs/swagger';
import { CreatePaymentEventDto } from './create-payment.dto';

export class UpdatePaymentDto extends PartialType(CreatePaymentEventDto) {}
