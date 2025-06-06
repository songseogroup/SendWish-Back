import { IsNotEmpty, IsString, IsNumber, IsPositive, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePaymentEventDto {
    @ApiProperty()
    @IsNotEmpty({ message: 'Gift message is required' })
    @IsString({ message: 'Gift message must be a string' })
    gift_message: string;

    @ApiProperty()
    @IsNotEmpty({ message: 'Gift amount is required' })
    @IsNumber({}, { message: 'Gift amount must be a number' })
    @IsPositive({ message: 'Gift amount must be a positive number' })
    gift_amount: number;

    @ApiProperty()
    @IsNotEmpty({ message: 'Country is required' })
    @IsString({ message: 'Country must be a string' })
    country: string;

    @ApiProperty()
    @IsNotEmpty({ message: 'Gift fee is required' })
    @IsNumber({}, { message: 'Gift fee must be a number' })
    @IsPositive({ message: 'Gift fee must be a positive number' })
    gift_fee: string;

    @ApiProperty()
    @IsNotEmpty({ message: 'User ID is required' })
    @IsString({ message: 'User ID must be a string' })
    userId: string;

    @ApiProperty()
    @IsNotEmpty({ message: 'event ID is required' })
    @IsNumber({}, { message: 'event ID must be a number' })
    eventId: number;

    @ApiProperty()
    @IsNotEmpty({ message: 'Payment intent ID is required' })
    @IsString({ message: 'Payment intent ID must be a string' })
    paymentIntentId: string;

    @ApiProperty()
    @IsNotEmpty({ message: 'Email is required' })
    @IsString({ message: 'Email must be a string' })
    email: string;
}
