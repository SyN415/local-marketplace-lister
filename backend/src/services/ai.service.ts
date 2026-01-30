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
   * Analyze a listing with multiple images for eBay search optimization and resale assessment
   * This is used by the multi-modal item identification pipeline
   * Enhanced for resale buyers with condition, color, and quality assessment
   * @param {Array<string>} imageUrls - Array of image URLs to analyze
   * @param {Object} context - Additional context (title, description, etc.)
   * @returns {Promise<Object>} Analysis result with brand, model, category, condition, color, and quality indicators
   */
  async analyzeListingForSearch(imageUrls: string[], context?: {
    title?: string;
    description?: string;
  }): Promise<any> {
    if (!this.openai) {
      throw new Error('AI service is not configured. Please check OPENROUTER_API_KEY.');
    }

    // If no images provided, fall back to text-only analysis
    if (!imageUrls || imageUrls.length === 0) {
      if (!context?.title && !context?.description) {
        throw new Error('No images or text provided for analysis');
      }
      console.log('[AIService] No images available, using text-only analysis');
      return await this.analyzeTextForSearchEnhanced(context.title || '', context.description || '');
    }

    try {
      // Prepare image content (limit to first 4 images for better analysis)
      const imageContent = imageUrls.slice(0, 4).map(url => ({
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
                text: `You are an expert resale product analyst specializing in marketplace flipping and e-commerce. Your task is to analyze product images for resale buyers who need accurate identification and condition assessment for pricing.

${contextText}

Analyze the provided images and return a valid JSON object with the following fields:

IDENTIFICATION:
- brand: The manufacturer/brand name (e.g., "Samsung", "Apple", "Dell", "NVIDIA"). Return null if not clearly identifiable.
- model: The specific model number or name (e.g., "RTX 4070", "iPhone 15 Pro", "PS5", "27GL850"). Return null if not clearly identifiable.
- category: The product category. Choose from: "computer", "laptop", "monitor", "phone", "tablet", "console", "gpu", "cpu", "audio", "camera", "furniture", "appliance", "clothing", "collectible", "tool", "sporting", "other".

CONDITION ASSESSMENT (Critical for resale pricing):
- condition: Assess the item's condition. Choose from:
  * "New" - Sealed/unopened, original packaging visible
  * "Like New" - Opened but pristine, no visible wear
  * "Good" - Minor cosmetic wear, fully functional appearance
  * "Fair" - Noticeable wear, scratches, or marks but appears functional
  * "Poor" - Significant damage, heavy wear, or missing parts visible
- conditionNotes: Array of specific observations about condition (e.g., ["minor scratches on screen", "original box included", "missing stand", "yellowing on plastic"]).

VISUAL ATTRIBUTES:
- color: Primary color of the item (e.g., "Black", "White", "Silver", "Space Gray", "Red"). Return null if unclear.
- keyAttributes: Array of 3-5 key specs visible in images (e.g., ["27 inch", "4K", "144Hz", "IPS panel", "RGB lighting"]).

RESALE INSIGHTS:
- estimatedAge: Estimated age of the item. Choose from: "New/Current", "1-2 years", "3-5 years", "5+ years", "Vintage", "Unknown".
- completeness: What's visible in terms of accessories/packaging. Choose from: "Complete with box", "Item only", "Missing accessories", "Partial/Bundle", "Unknown".
- resaleFlags: Array of factors that affect resale value (e.g., ["original packaging", "rare color", "discontinued model", "cosmetic damage", "smoking environment", "pet hair visible", "aftermarket parts"]).

CONFIDENCE:
- confidence: A number from 0 to 1 indicating your overall confidence in the identification.
- description: A brief 1-2 sentence description focused on resale relevance.

IMPORTANT GUIDELINES FOR RESALE ANALYSIS:
1. Be conservative with condition - buyers prefer underselling condition than overselling.
2. Look for: scratches, dents, discoloration, dust, missing parts, cable condition, screen damage.
3. Note if original packaging, manuals, or accessories are visible.
4. For electronics: check for model numbers on labels, stickers, or engravings.
5. For gaming PCs: identify visible components (GPU brand/model, RGB, case brand).
6. Flag anything that would affect resale value negatively or positively.
7. If images are low quality or unclear, set confidence low and note this in conditionNotes.

Output pure JSON only. Do not use markdown formatting.`
              },
              ...imageContent,
            ],
          },
        ],
        response_format: { type: "json_object" },
        max_tokens: 1200,
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error('No content received from OpenAI');
      }

      // Clean up potential markdown code blocks
      const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
      const result = JSON.parse(cleanContent);

      // Validate and normalize the result with enhanced fields
      return {
        success: true,
        // Identification
        brand: result.brand || null,
        model: result.model || null,
        category: result.category || null,
        // Condition Assessment
        condition: this.normalizeCondition(result.condition),
        conditionNotes: Array.isArray(result.conditionNotes) ? result.conditionNotes.slice(0, 5) : [],
        // Visual Attributes
        color: result.color || null,
        keyAttributes: Array.isArray(result.keyAttributes) ? result.keyAttributes.slice(0, 5) : [],
        // Resale Insights
        estimatedAge: result.estimatedAge || 'Unknown',
        completeness: result.completeness || 'Unknown',
        resaleFlags: Array.isArray(result.resaleFlags) ? result.resaleFlags.slice(0, 5) : [],
        // Confidence
        confidence: typeof result.confidence === 'number' ? Math.min(1, Math.max(0, result.confidence)) : 0.5,
        description: result.description || null
      };
    } catch (error) {
      console.error('Error analyzing listing for search:', error);
      throw new Error('Failed to analyze listing for search optimization');
    }
  }

  /**
   * Normalize condition string to standard values
   */
  private normalizeCondition(condition: string | null | undefined): string {
    if (!condition) return 'Unknown';

    const normalized = condition.toLowerCase().trim();

    if (normalized.includes('new') && !normalized.includes('like')) return 'New';
    if (normalized.includes('like new') || normalized.includes('mint') || normalized.includes('excellent')) return 'Like New';
    if (normalized.includes('good') || normalized.includes('great')) return 'Good';
    if (normalized.includes('fair') || normalized.includes('acceptable') || normalized.includes('used')) return 'Fair';
    if (normalized.includes('poor') || normalized.includes('parts') || normalized.includes('damaged')) return 'Poor';

    return 'Unknown';
  }

  /**
   * Enhanced text-only analysis for resale buyers when images aren't available
   * Extracts condition, color, and resale insights from text
   * @param {string} title - The listing title
   * @param {string} description - The listing description
   * @returns {Promise<Object>} Enhanced analysis result with resale fields
   */
  async analyzeTextForSearchEnhanced(title: string, description: string): Promise<any> {
    if (!this.openai) {
      throw new Error('AI service is not configured. Please check OPENROUTER_API_KEY.');
    }

    try {
      const response = await this.openai.chat.completions.create({
        model: "google/gemini-2.5-flash-lite-preview-09-2025",
        messages: [
          {
            role: "user",
            content: `You are an expert resale product analyst. Extract product information from the following listing text for resale buyers.

Title: "${title}"
Description: "${description.substring(0, 1000)}"

Return a valid JSON object with the following fields:

IDENTIFICATION:
- brand: The manufacturer/brand name. Return null if not mentioned.
- model: The specific model number or name. Return null if not mentioned.
- category: The product category. Choose from: "computer", "laptop", "monitor", "phone", "tablet", "console", "gpu", "cpu", "audio", "camera", "furniture", "appliance", "clothing", "collectible", "tool", "sporting", "other".

CONDITION (from text clues):
- condition: If seller mentions condition, choose from: "New", "Like New", "Good", "Fair", "Poor". Default to "Unknown" if not mentioned.
- conditionNotes: Array of condition-related phrases from the text.

ATTRIBUTES:
- color: Primary color if mentioned. Return null if not mentioned.
- keyAttributes: Array of 3-5 key specs/dimensions mentioned.

RESALE INSIGHTS:
- estimatedAge: If mentioned. Choose from: "New/Current", "1-2 years", "3-5 years", "5+ years", "Unknown".
- completeness: If mentioned. Choose from: "Complete with box", "Item only", "Missing accessories", "Unknown".
- resaleFlags: Array of factors affecting resale value mentioned in text.

- confidence: A number from 0 to 1. Lower confidence (0.3-0.5) since this is text-only analysis.
- description: Brief resale-relevant summary.
- analysisType: "text-only"

Output pure JSON only.`
          },
        ],
        response_format: { type: "json_object" },
        max_tokens: 800,
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error('No content received from OpenAI');
      }

      const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
      const result = JSON.parse(cleanContent);

      return {
        success: true,
        analysisType: 'text-only',
        // Identification
        brand: result.brand || null,
        model: result.model || null,
        category: result.category || null,
        // Condition Assessment
        condition: this.normalizeCondition(result.condition),
        conditionNotes: Array.isArray(result.conditionNotes) ? result.conditionNotes.slice(0, 5) : [],
        // Visual Attributes
        color: result.color || null,
        keyAttributes: Array.isArray(result.keyAttributes) ? result.keyAttributes.slice(0, 5) : [],
        // Resale Insights
        estimatedAge: result.estimatedAge || 'Unknown',
        completeness: result.completeness || 'Unknown',
        resaleFlags: Array.isArray(result.resaleFlags) ? result.resaleFlags.slice(0, 5) : [],
        // Lower confidence for text-only
        confidence: typeof result.confidence === 'number' ? Math.min(0.6, Math.max(0.2, result.confidence)) : 0.4,
        description: result.description || 'Text-only analysis (images unavailable)'
      };
    } catch (error) {
      console.error('Error in text-only analysis:', error);
      throw new Error('Failed to analyze listing text');
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