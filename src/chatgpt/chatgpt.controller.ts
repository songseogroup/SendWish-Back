import { Controller, Post, Body } from '@nestjs/common';
import { ChatGptService } from './chatgpt.service';

@Controller('chatgpt')
export class ChatGptController {
  constructor(private readonly chatGptService: ChatGptService) {}

  @Post('generate-message')
  async generateMessage(
    @Body('recipient') recipient: string,
    @Body('occasion') occasion: string,
  ) {
    return await this.chatGptService.generateMessage(recipient, occasion);
  }
}
