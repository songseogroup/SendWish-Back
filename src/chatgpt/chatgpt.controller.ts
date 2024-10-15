import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { GenerateMessageDto } from './dto/generate-message.dto'; // Update the import path if necessary
import { ChatGptService } from './Chatgpt.service';

@Controller('chatgpt')
export class ChatGptController {
  constructor(private readonly chatGptService: ChatGptService) {}

  @Post('generate-message')
  @ApiOperation({ summary: 'Generate a message' }) // Summary for Swagger
  @ApiResponse({ status: 200, description: 'Message generated successfully.' }) // Successful response
  @ApiResponse({ status: 400, description: 'Invalid input.' }) // Bad request response
  async generateMessage(@Body() generateMessageDto: GenerateMessageDto) {
    const { recipient, occasion , relation,type,date} = generateMessageDto; // Destructure from DTO
    return await this.chatGptService.generateMessage(recipient, occasion,relation,type,date);
  }
}