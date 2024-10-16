import { IsString, IsNotEmpty, IsDate, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class GenerateMessageDto {
  @IsString()
  @IsNotEmpty()
  recipient: string;

  @IsString()
  @IsNotEmpty()
  occasion: string;

  @IsString()
  @IsNotEmpty()
  relation: string;

  @IsString()
  type: string;

  @IsOptional() 
  @Type(() => Date) 
  @IsDate()
  date?: Date;
}
