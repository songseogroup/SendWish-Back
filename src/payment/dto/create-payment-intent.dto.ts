import { IsNotEmpty, IsNumber } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class CreateGiftDto {
    @ApiProperty()
    @IsNotEmpty()
    @IsNumber()
    userId: number;
  
    @ApiProperty()
    @IsNotEmpty()
    @IsNumber()
    gift_amount: number;
  }