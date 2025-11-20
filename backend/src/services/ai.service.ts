import OpenAI from 'openai';
import { config } from '../config/config';

export class AIService {
  private openai: OpenAI | null = null;

  constructor() {
    const apiKey = process.env.OPENROUTER_API_KEY;
    
    if (apiKey) {
      try {
        this.openai = new OpenAI({
          apiKey: apiKey,
          baseURL: 'https://openrouter.ai/api/v1',
          defaultHeaders: {
            'HTTP-Referer': process.env.FRONTEND_URL || 'http://localhost:5173',
            'X-Title': 'Local Marketplace Lister',
          },
        });
      } catch (error) {
        console.warn('Failed to initialize OpenAI client:', error);
      }
    } else {
      console.warn('OPENROUTER_API_KEY is missing. AI features will be disabled.');
    }
  }

  async analyzeImage(imageBase64: string): Promise<any> {
    if (!this.openai) {
      throw new Error('AI service is not configured. Please check OPENROUTER_API_KEY.');
    }

    try {
      const response = await this.openai.chat.completions.create({
        model: "google/gemini-flash-1.5", // Switch to Gemini Flash via OpenRouter
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analyze this image and provide a listing description for a marketplace. Return a valid JSON object with the following fields: title, description, category (suggested), condition (suggested: 'New', 'Like New', 'Good', 'Fair', 'Poor'), and estimatedPrice (optional number). Ensure the description is detailed and highlights key features. DO NOT wrap the JSON in markdown code blocks."
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
        max_tokens: 1000,
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error('No content received from OpenAI');
      }

      // Clean up potential markdown code blocks if Gemini adds them
      const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
      return JSON.parse(cleanContent);
    } catch (error) {
      console.error('Error analyzing image:', error);
      throw new Error('Failed to analyze image');
    }
  }
}

export const aiService = new AIService();