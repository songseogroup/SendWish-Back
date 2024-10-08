import { Injectable } from '@nestjs/common';
import OpenAI from 'openai'; // Use the default import

@Injectable()
export class ChatGptService {
  private openai: OpenAI;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    console.log('OpenAI API Key:', apiKey);
    this.openai = new OpenAI({
      organization: "org-CqWhbUsGc9CQM2Z7LzrE0bro",
      // project: "$PROJECT_ID",
      apiKey: apiKey, // Ensure your .env file contains this key
    });
  }

  async generateMessage(recipient: string, occasion: string): Promise<string> {
    const prompt = `Write a personalized message for ${recipient} on the occasion of ${occasion}. The message should be between 100 and 150 words.dont add my name`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo', // Use a more recent model if available
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 150,
        temperature: 0.7, // Adjust for creativity
      });

      // Ensure the response has choices and return the text
      if (response.choices && response.choices.length > 0) {
        return response.choices[0].message.content.trim();
      } else {
        throw new Error('No message generated.');
      }
    } catch (error) {
      console.error('Error generating message:', error);
      throw new Error('Could not generate message. Please try again later.');
    }
  }
}
