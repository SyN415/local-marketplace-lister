import OpenAI from 'openai';
import { config } from '../config/config';

export class AIService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async analyzeImage(imageBase64: string): Promise<any> {
    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analyze this image and provide a listing description for a marketplace. Return a JSON object with the following fields: title, description, category (suggested), condition (suggested: 'New', 'Like New', 'Good', 'Fair', 'Poor'), and estimatedPrice (optional number). Ensure the description is detailed and highlights key features."
              },
              {
                type: "image_url",
                image_url: {
                  url: imageBase64.startsWith('data:image') ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`,
                },
              },
            ],
          },
        ],
        response_format: { type: "json_object" },
        max_tokens: 500,
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error('No content received from OpenAI');
      }

      return JSON.parse(content);
    } catch (error) {
      console.error('Error analyzing image:', error);
      throw new Error('Failed to analyze image');
    }
  }
}

export const aiService = new AIService();