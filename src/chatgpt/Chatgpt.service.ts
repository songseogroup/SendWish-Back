

import { Injectable } from '@nestjs/common';
import OpenAI from 'openai'; // Use the default import

@Injectable()
export class ChatGptService {
  private openai: OpenAI;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OpenAI API Key not found in environment variables.');
    }
    this.openai = new OpenAI({
      organization: "org-CqWhbUsGc9CQM2Z7LzrE0bro",
      apiKey: apiKey, // Ensure your .env file contains this key
    });
  }

  async generateMessage(
    recipient: string,
    occasion: string,
    relation: string,
    type: string,
    date: Date
  ): Promise<object> {
    const formattedDate = date ? date.toISOString().split('T')[0] : '';
    const occasionLower = occasion.toLowerCase();
  
    // Determine the wishing well message
    let wishingWellNote =
      "We don't expect gifts, but if you'd like to contribute, our wishing well is available here. We appreciate all your support.";
  
    if (occasionLower.includes('wedding')) {
      wishingWellNote =
        "Your presence is the greatest gift. If you'd like to contribute to our wishing well, this is our wishing well link.";
    }
  
    // Prompt based on type
    let prompt = '';
  
    if (type === 'g-sender') {
      prompt = `Write a heartfelt and personalized message for my ${recipient}, who is my ${relation}, for their ${occasion}. The tone should be warm and appropriate to the occasion. Keep the message between 100 and 150 words. Do not include 'regards' or [Your Name]. End the message with this wishing well note:
  
  "${wishingWellNote}"`;
    } else {
      prompt = `Write a warm, well-wishing message for the event creators for their ${occasion} on ${formattedDate}. The message should be suitable for displaying beside a money gift image or as an invitation. Keep it between 100 and 150 words. Do not include 'regards' or [Your Name]. End the message with this wishing well note:
  
  "${wishingWellNote}"`;
    }
  
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 200,
        temperature: 0.7,
      });
  
      if (response.choices && response.choices.length > 0) {
        return {
          message: response.choices[0].message.content.trim(),
        };
      } else {
        throw new Error('No message generated.');
      }
    } catch (error) {
      console.error('Error generating message:', error);
      throw new Error('Could not generate message. Please try again later.');
    }
  }
}
