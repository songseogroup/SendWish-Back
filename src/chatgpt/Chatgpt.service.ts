import { Injectable } from '@nestjs/common';
import OpenAI from 'openai'; // Use the default import

@Injectable()
export class ChatGptService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY, // Add your OpenAI API key in the .env file
    });
  }

  async generateMessage(recipient: string, occasion: string): Promise<string> {
    const prompt = `Write a personalized message for ${recipient} on the occasion of ${occasion}. The message should be between 100 and 150 words.`;

    try {
      const response = await this.openai.completions.create({
        model: 'text-davinci-003',
        prompt,
        max_tokens: 150,
        temperature: 0.7, // Adjust for creativity
      });

      return response.choices[0].text.trim();
    } catch (error) {
      console.error('Error generating message:', error);
      throw new Error('Could not generate message.');
    }
  }
}
