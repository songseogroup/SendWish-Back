import { IsNotEmpty, IsString, IsUrl, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
export class CreateEventDto {
  @ApiProperty()
  @IsNotEmpty({ message: 'Date is required' })
  @IsString({ message: 'Date must be a string' })
  readonly date: string;

  @ApiProperty()
  @IsNotEmpty({ message: 'Event name is required' })
  @IsString({ message: 'Event name must be a string' })
  readonly event_name: string;

  @ApiProperty()
  
   image: any;

  @ApiProperty()
  @IsNotEmpty({ message: 'Event description is required' })
  @IsString({ message: 'Event description must be a string' })
  readonly event_description: string;

  @ApiProperty()
  @IsNotEmpty({ message: 'Event URL is required' })
  readonly event_url: string;

  @ApiProperty()
  @Transform(({ value }) => parseInt(value, 10))
  // @IsNotEmpty({ message: 'User ID is required' })
  @IsNumber({}, { message: 'User ID must be a number' })
  userId?: number;
}
