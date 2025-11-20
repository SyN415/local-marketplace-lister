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
        model: "google/gemini-2.5-flash-lite-preview-09-2025", // Switch to Gemini Flash via OpenRouter
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `You are an expert sales copywriter and visual merchandiser. Your goal is to identify sellable items and describe them persuasively.
    
    Analyze this image and return a valid JSON object with the following fields:
    - title: A catchy, search-optimized title.
    - description: A concise, persuasive, sales-oriented description. Identify the item(s) (prioritizing the top 3 most prominent if multiple) and highlight key features/benefits. Do not describe the full scene or background. Do not include personal details.
    - category: Choose strictly from: 'Apparel & Accessories', 'Electronics', 'Home & Garden', 'Automotive', 'Beauty & Personal Care', 'Books & Media', 'Sports & Outdoors', 'Toys & Hobbies', 'Food & Beverage', 'Health & Wellness', 'Pets & Supplies', 'Business & Office', 'Art & Collectibles', 'Miscellaneous'.
    - condition: One of: 'New', 'Like New', 'Good', 'Fair', 'Poor'.
    - price: A number representing the estimated market value.
    
    If no sellable items are clearly visible, return category 'Miscellaneous' and a description advising to upload a clearer photo.
    
    Output pure JSON only. Do not use markdown formatting.`
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