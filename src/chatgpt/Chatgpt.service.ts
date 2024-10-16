// import { Injectable } from '@nestjs/common';
// import OpenAI from 'openai'; // Use the default import

// @Injectable()
// export class ChatGptService {
//   private openai: OpenAI;

//   constructor() {
//     const apiKey = process.env.OPENAI_API_KEY;
//     console.log('OpenAI API Key:', apiKey);
//     this.openai = new OpenAI({
//       organization: "org-CqWhbUsGc9CQM2Z7LzrE0bro",
//       apiKey: apiKey, // Ensure your .env file contains this key
//     });
//   }

//   async generateMessage(recipient: string, occasion: string, relation: string,type:string,date:Date): Promise<object> {
   
//     if (type === "g-sender"){
//       const prompt = `Write a personalized message for my ${recipient} who is my ${relation}, for his/her  ${occasion} occasion. The message should be between 100 and 150 words dont add regard at the end by me also dont add [Your Name] at the end please `;
//       try {
//         const response = await this.openai.chat.completions.create({
//           model: 'gpt-4-turbo', // Use a more recent model if available
//           messages: [{ role: 'user', content: prompt }],
//           max_tokens: 150,
//           temperature: 0.7, // Adjust for creativity
//         });
  
//         // Ensure the response has choices and return the text
//         if (response.choices && response.choices.length > 0) {
//           const resultObject = {
//             message: response.choices[0].message.content.trim()
//           };
      
//           return resultObject;
//         } else {
//           throw new Error('No message generated.');
//         }
//       } catch (error) {
//         console.error('Error generating message:', error);
//         throw new Error('Could not generate message. Please try again later.');
//       }
//     }else {
//       try {
//         const prompt = `Write a generalized message for my close people for this  ${occasion} occasion of mine invite them for the occasion on this ${date}. The message should be between 100 and 150 words dont add regard at the end by me also dont add [Your Name] at the end please `;
//         const response = await this.openai.chat.completions.create({
//           model: 'gpt-4-turbo', // Use a more recent model if available
//           messages: [{ role: 'user', content: prompt }],
//           max_tokens: 150,
//           temperature: 0.7, // Adjust for creativity
//         });
  
//         // Ensure the response has choices and return the text
//         if (response.choices && response.choices.length > 0) {
//           const resultObject = {
//             message: response.choices[0].message.content.trim()
//           };
      
//           return resultObject;
//         } else {
//           throw new Error('No message generated.');
//         }
//       } catch (error) {
//         console.error('Error generating message:', error);
//         throw new Error('Could not generate message. Please try again later.');
//       }

//     }

   
//   }
// }

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
    let prompt = '';
    const formattedDate = date ? date.toISOString().split('T')[0] : ''; // Format date to yyyy-mm-dd if available

    if (type === "g-sender") {
      prompt = `Write a personalized message for my ${recipient}, who is my ${relation}, for his/her ${occasion} occasion. The message should be between 100 and 150 words. Please don't add "regards" or [Your Name] at the end.`;
    } else {
      prompt = `Write a generalized message for my close people inviting them for the ${occasion} occasion on ${formattedDate}. The message should be between 100 and 150 words. Please don't add "regards" or [Your Name] at the end.`;
    }

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo', // Use a more recent model if available
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 200, // Increased slightly for flexibility
        temperature: 0.7, // Adjust for creativity
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
