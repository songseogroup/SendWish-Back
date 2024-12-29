import { IsNotEmpty, IsNumber,IsOptional,IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreateGiftDto {
  // @ApiProperty()
  // @IsOptional()  // Since userId is optional, we mark it as optional here.
  // @IsNumber()
  // userId?: number;

  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  gift_amount: number;
  @ApiProperty()
  @IsNotEmpty()
  @IsNumber()
  gift_fee: number;
 
  @ApiProperty()
  @IsOptional()  // Expecting the Stripe customer ID as a string
  customerStripeId: string | null;
  }