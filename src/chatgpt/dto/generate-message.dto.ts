import { IsString, IsNotEmpty } from 'class-validator';

export class GenerateMessageDto {
  @IsString()
  @IsNotEmpty() // Ensures the recipient is not an empty string
  recipient: string;

  @IsString()
  @IsNotEmpty() // Ensures the occasion is not an empty string
  occasion: string;
}
