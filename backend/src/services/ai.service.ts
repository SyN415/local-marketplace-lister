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

  /**
   * Analyze a listing with multiple images for eBay search optimization
   * This is used by the multi-modal item identification pipeline
   * @param {Array<string>} imageUrls - Array of image URLs to analyze
   * @param {Object} context - Additional context (title, description, etc.)
   * @returns {Promise<Object>} Analysis result with brand, model, category, and key attributes
   */
  async analyzeListingForSearch(imageUrls: string[], context?: {
    title?: string;
    description?: string;
  }): Promise<any> {
    if (!this.openai) {
      throw new Error('AI service is not configured. Please check OPENROUTER_API_KEY.');
    }

    if (!imageUrls || imageUrls.length === 0) {
      throw new Error('No images provided for analysis');
    }

    try {
      // Prepare image content (limit to first 3 images for efficiency)
      const imageContent = imageUrls.slice(0, 3).map(url => ({
        type: "image_url" as const,
        image_url: {
          url: url.startsWith('data:') ? url : url,
        },
      }));

      // Build context text
      let contextText = '';
      if (context?.title) {
        contextText += `Listing Title: "${context.title}"\n`;
      }
      if (context?.description) {
        contextText += `Description: "${context.description.substring(0, 500)}"\n`;
      }

      const response = await this.openai.chat.completions.create({
        model: "google/gemini-2.5-flash-lite-preview-09-2025",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `You are an expert product identifier specializing in e-commerce search optimization. Your task is to analyze product images and extract key identifiers for eBay search queries.

${contextText}

Analyze the provided images and return a valid JSON object with the following fields:
- brand: The manufacturer/brand name (e.g., "Samsung", "Apple", "Dell", "Sony"). Return null if not clearly identifiable.
- model: The specific model number or name (e.g., "RTX 4070", "iPhone 15 Pro", "PS5", "27GL850"). Return null if not clearly identifiable.
- category: The product category (e.g., "monitor", "laptop", "phone", "console", "speaker", "camera", "furniture", "appliance"). Return null if not clearly identifiable.
- keyAttributes: An array of 3-5 key attributes/specs visible in the images (e.g., ["27 inch", "4K", "144Hz", "IPS panel", "USB-C"]). Focus on specs that would help with eBay search.
- confidence: A number from 0 to 1 indicating your confidence in the identification. Higher if brand/model are clearly visible.
- description: A brief 1-2 sentence description of what you see.

IMPORTANT GUIDELINES:
1. Only extract brand/model if you are confident (confidence >= 0.6). Otherwise return null.
2. For electronics, prioritize: GPU model, CPU model, screen size, resolution, refresh rate.
3. For phones: brand, model, storage capacity, color.
4. For monitors: brand, size, resolution, refresh rate, panel type.
5. For furniture: type, material, color, dimensions.
6. Keep keyAttributes concise and search-friendly (2-4 words each).
7. If images are blurry or unclear, set confidence low and return null for uncertain fields.

Output pure JSON only. Do not use markdown formatting.`
              },
              ...imageContent,
            ],
          },
        ],
        response_format: { type: "json_object" },
        max_tokens: 800,
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error('No content received from OpenAI');
      }

      // Clean up potential markdown code blocks
      const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
      const result = JSON.parse(cleanContent);

      // Validate and normalize the result
      return {
        success: true,
        brand: result.brand || null,
        model: result.model || null,
        category: result.category || null,
        keyAttributes: Array.isArray(result.keyAttributes) ? result.keyAttributes.slice(0, 5) : [],
        confidence: typeof result.confidence === 'number' ? Math.min(1, Math.max(0, result.confidence)) : 0.5,
        description: result.description || null
      };
    } catch (error) {
      console.error('Error analyzing listing for search:', error);
      throw new Error('Failed to analyze listing for search optimization');
    }
  }

  /**
   * Analyze text (title + description) to extract structured product information
   * This is a fallback when image analysis is not available
   * @param {string} title - The listing title
   * @param {string} description - The listing description
   * @returns {Promise<Object>} Extracted product information
   */
  async analyzeTextForSearch(title: string, description: string): Promise<any> {
    if (!this.openai) {
      throw new Error('AI service is not configured. Please check OPENROUTER_API_KEY.');
    }

    try {
      const response = await this.openai.chat.completions.create({
        model: "google/gemini-2.5-flash-lite-preview-09-2025",
        messages: [
          {
            role: "user",
            content: `You are an expert product identifier specializing in e-commerce search optimization. Extract key product identifiers from the following listing text.

Title: "${title}"
Description: "${description.substring(0, 1000)}"

Return a valid JSON object with the following fields:
- brand: The manufacturer/brand name (e.g., "Samsung", "Apple", "Dell", "Sony"). Return null if not clearly mentioned.
- model: The specific model number or name (e.g., "RTX 4070", "iPhone 15 Pro", "PS5"). Return null if not clearly mentioned.
- category: The product category (e.g., "monitor", "laptop", "phone", "console", "speaker"). Return null if not clearly identifiable.
- keyAttributes: An array of 3-5 key specs mentioned in the text (e.g., ["27 inch", "4K", "144Hz", "16GB RAM", "512GB SSD"]).
- confidence: A number from 0 to 1 indicating your confidence in the extraction.

IMPORTANT GUIDELINES:
1. Only extract brand/model if explicitly mentioned in the text.
2. Look for common patterns: "RTX/GTX/RX + numbers", "i5/i7/i9 + numbers", "Ryzen + numbers", "iPhone + model", "Galaxy + model".
3. Extract specs like RAM, storage, screen size, resolution, refresh rate when mentioned.
4. Keep keyAttributes concise and search-friendly.

Output pure JSON only. Do not use markdown formatting.`
          },
        ],
        response_format: { type: "json_object" },
        max_tokens: 600,
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error('No content received from OpenAI');
      }

      const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
      const result = JSON.parse(cleanContent);

      return {
        success: true,
        brand: result.brand || null,
        model: result.model || null,
        category: result.category || null,
        keyAttributes: Array.isArray(result.keyAttributes) ? result.keyAttributes.slice(0, 5) : [],
        confidence: typeof result.confidence === 'number' ? Math.min(1, Math.max(0, result.confidence)) : 0.5
      };
    } catch (error) {
      console.error('Error analyzing text for search:', error);
      throw new Error('Failed to analyze text for search optimization');
    }
  }
}

export const aiService = new AIService();