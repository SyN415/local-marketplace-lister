// Multi-Modal Item Identification Pipeline
// Combines visual and textual analysis to generate optimized eBay search queries

import { getBackendUrl, config } from '../config.js';

/**
 * Multi-Modal Item Identifier
 * 
 * This module implements a pipeline that:
 * 1. Extracts listing images and analyzes them via AI (OpenRouter)
 * 2. Parses and structures textual data (title, description, specs)
 * 3. Merges visual and textual outputs into an optimized eBay search query
 * 4. Implements fallback logic for edge cases
 */

class MultimodalIdentifier {
  constructor() {
    this.aiEndpoint = null;
    this.authToken = null;
    this.cache = new Map();
    this.cacheTimeout = 24 * 60 * 60 * 1000; // 24 hours
  }

  /**
   * Initialize the identifier with API configuration
   */
  async initialize() {
    try {
      // IMPORTANT:
      // The extension must NOT call OpenRouter directly with an API key.
      // Instead, it calls the backend AI proxy using the user's auth token.
      const { authToken } = await chrome.storage.local.get(['authToken']);
      this.authToken = authToken || null;

      if (!this.authToken) {
        console.warn('[MultimodalIdentifier] No auth token available; AI analysis disabled');
        return false;
      }

      const backendUrl = await getBackendUrl();
      this.aiEndpoint = `${backendUrl}/api/ai/analyze-listing`;
      
      console.log('[MultimodalIdentifier] Initialized successfully');
      return true;
    } catch (error) {
      console.error('[MultimodalIdentifier] Initialization failed:', error);
      return false;
    }
  }

  /**
   * Main entry point: Analyze a listing and generate optimized search query
   * @param {Object} listingData - The listing data from Facebook Scout
   * @returns {Promise<Object>} Analysis result with query and confidence
   */
  async analyzeListing(listingData) {
    const startTime = Date.now();
    const cacheKey = this.getCacheKey(listingData);

    // Check cache first
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (cached.expiresAt > Date.now()) {
        console.log('[MultimodalIdentifier] Using cached analysis');
        return cached.result;
      }
    }

    console.log('[MultimodalIdentifier] Starting multi-modal analysis');

    // Step 1: Extract and analyze images (visual analysis)
    // Prefer in-page fetched data URLs when available (FB CDN often blocks backend fetching).
    const visualInputs = (Array.isArray(listingData.imageDataUrls) && listingData.imageDataUrls.length)
      ? listingData.imageDataUrls
      : (listingData.imageUrls || []);

    const visualAnalysis = await this.analyzeImages(
      visualInputs,
      {
        title: listingData.title,
        description: listingData.fullDescription,
        attributes: listingData.attributes,
        extractedSpecs: listingData.extractedSpecs
      }
    );

    // Step 2: Parse and structure textual data
    const textualAnalysis = this.analyzeText(listingData);

    // Step 3: Merge analyses into unified query
    const mergedResult = this.mergeAnalyses(visualAnalysis, textualAnalysis, listingData);

    // Cache the result
    this.cache.set(cacheKey, {
      result: mergedResult,
      expiresAt: Date.now() + this.cacheTimeout
    });

    const duration = Date.now() - startTime;
    console.log(`[MultimodalIdentifier] Analysis complete in ${duration}ms`, mergedResult);

    return mergedResult;
  }

  /**
   * Get cache key for listing data
   */
  getCacheKey(listingData) {
    const parts = [
      listingData.title || '',
      listingData.url || '',
      (listingData.imageUrls || []).slice(0, 2).join(',')
    ];
    return parts.join('::').toLowerCase().slice(0, 200);
  }

  /**
   * Step 1: Visual Analysis - Analyze images via OpenRouter API
   * @param {Array<string>} imageUrls - Array of image URLs
   * @returns {Promise<Object>} Visual analysis result
   */
  async analyzeImages(imageUrls, context) {
    const result = {
      success: false,
      confidence: 0,
      brand: null,
      model: null,
      category: null,
      keyAttributes: [],
      description: null,
      error: null
    };

    // Fallback: No images available
    if (!imageUrls || imageUrls.length === 0) {
      console.warn('[MultimodalIdentifier] No images available for visual analysis');
      result.error = 'no_images';
      return result;
    }

    // Use first 3 images (primary + 2 alternates) for analysis
    const imagesToAnalyze = imageUrls.slice(0, 3);

    try {
      // Check if user is authenticated (backend AI routes are protected)
      if (!this.authToken) {
        result.error = 'auth_required';
        return result;
      }

      // Prepare request payload (include context to improve accuracy)
      const payload = {
        images: imagesToAnalyze,
        context: {
          title: context?.title,
          description: context?.description,
          attributes: context?.attributes,
          extractedSpecs: context?.extractedSpecs
        }
      };

      // Call backend AI endpoint (which uses OpenRouter)
      const response = await fetch(this.aiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authToken}`
        },
        body: JSON.stringify(payload)
      });

      if (response.status === 401) {
        // Token expired/invalid; let caller fallback to text-only flow.
        result.error = 'auth_required';
        result.confidence = 0;
        return result;
      }

      if (!response.ok) {
        throw new Error(`AI API returned ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.analysis) {
        result.success = true;
        result.confidence = data.analysis.confidence || 0.5;
        result.brand = data.analysis.brand || null;
        result.model = data.analysis.model || null;
        result.category = data.analysis.category || null;
        result.keyAttributes = data.analysis.keyAttributes || [];
        result.description = data.analysis.description || null;
      } else {
        result.error = data.error || 'analysis_failed';
      }

    } catch (error) {
      console.error('[MultimodalIdentifier] Visual analysis failed:', error);
      result.error = 'network_error';
      result.confidence = 0;
    }

    return result;
  }

  /**
   * Step 2: Textual Analysis - Parse and structure text data
   * @param {Object} listingData - The listing data
   * @returns {Promise<Object>} Textual analysis result
   */
  analyzeText(listingData) {
    const result = {
      brand: null,
      model: null,
      category: null,
      keyAttributes: [],
      specs: {},
      confidence: 0
    };

    try {
      // Extract from title
      const titleAnalysis = this.parseTitle(listingData.title || '');
      result.brand = result.brand || titleAnalysis.brand;
      result.model = result.model || titleAnalysis.model;
      result.category = result.category || titleAnalysis.category;
      result.confidence = Math.max(result.confidence, titleAnalysis.confidence);

      // Extract from description
      const descAnalysis = this.parseDescription(listingData.fullDescription || '');
      result.specs = { ...result.specs, ...descAnalysis.specs };
      result.keyAttributes = [...result.keyAttributes, ...descAnalysis.attributes];

      // Extract from marketplace attributes (Facebook structured fields)
      if (listingData.attributes) {
        const attrsAnalysis = this.parseAttributes(listingData.attributes);
        result.brand = result.brand || attrsAnalysis.brand;
        result.model = result.model || attrsAnalysis.model;
        result.specs = { ...result.specs, ...attrsAnalysis.specs };
      }

      // Extract from extractedSpecs (already parsed by facebook-scout)
      if (listingData.extractedSpecs) {
        result.specs = { ...result.specs, ...listingData.extractedSpecs };
      }

      // Calculate overall confidence based on data quality
      result.confidence = this.calculateTextConfidence(listingData, result);

    } catch (error) {
      console.error('[MultimodalIdentifier] Textual analysis failed:', error);
    }

    return result;
  }

  /**
   * Parse title for brand, model, and category
   */
  parseTitle(title) {
    const result = {
      brand: null,
      model: null,
      category: null,
      confidence: 0
    };

    if (!title || title.length < 3) {
      return result;
    }

    const titleLower = title.toLowerCase();

    // Brand detection - common brands by category
    const brands = {
      electronics: ['apple', 'samsung', 'lg', 'sony', 'dell', 'hp', 'lenovo', 'asus', 'acer', 'msi', 'alienware', 'razer', 'logitech', 'corsair', 'nvidia', 'amd', 'intel'],
      monitors: ['samsung', 'lg', 'dell', 'asus', 'acer', 'benq', 'aoc', 'msi', 'alienware', 'gigabyte'],
      phones: ['apple', 'samsung', 'google', 'oneplus', 'xiaomi', 'motorola', 'nokia', 'huawei'],
      audio: ['sony', 'bose', 'jbl', 'harman', 'sennheiser', 'audio-technica', 'shure'],
      gaming: ['playstation', 'xbox', 'nintendo', 'steam', 'razer', 'logitech', 'corsair']
    };

    // Detect brand
    for (const [category, brandList] of Object.entries(brands)) {
      for (const brand of brandList) {
        if (titleLower.includes(brand)) {
          result.brand = brand.charAt(0).toUpperCase() + brand.slice(1);
          result.category = category;
          result.confidence += 0.3;
          break;
        }
      }
      if (result.brand) break;
    }

    // Model detection patterns
    const modelPatterns = [
      // GPU models
      { regex: /\b(?:rtx|gtx|rx)\s*\d{3,4}(?:\s*(?:ti|super|xt))?\b/i, field: 'gpu' },
      // CPU models
      { regex: /\b(?:i[3579]-?\d{4,5}[a-z]*|ryzen\s*\d+\s*\d{4}[a-z]*)\b/i, field: 'cpu' },
      // iPhone models
      { regex: /\biphone\s*\d{1,2}(?:\s*(?:pro|max|plus|mini))?\b/i, field: 'phone' },
      // Samsung Galaxy
      { regex: /\bgalaxy\s*s\d{1,2}(?:\s*(?:plus|ultra|fe))?|note\s*\d{1,2}\b/i, field: 'phone' },
      // PlayStation
      { regex: /\bps\s*\d{1,2}(?:\s*(?:pro|slim))?|playstation\s*\d{1,2}(?:\s*(?:pro|slim))?\b/i, field: 'console' },
      // Xbox
      { regex: /\bxbox\s*(?:series\s*)?[xsd]\b/i, field: 'console' },
      // Monitor models
      { regex: /\b\d{2,3}["']?\s*(?:hz|4k|1080p|1440p|qhd|uhd|fhd)\b/i, field: 'monitor' }
    ];

    for (const pattern of modelPatterns) {
      const match = title.match(pattern.regex);
      if (match) {
        result.model = match[0].toUpperCase();
        result.confidence += 0.4;
        break;
      }
    }

    // Category detection from title keywords
    const categoryKeywords = {
      'monitor': ['monitor', 'display', 'screen', 'tv'],
      'computer': ['pc', 'desktop', 'computer', 'tower', 'build'],
      'laptop': ['laptop', 'notebook', 'macbook', 'ultrabook'],
      'phone': ['phone', 'iphone', 'android', 'smartphone'],
      'console': ['playstation', 'xbox', 'nintendo', 'switch', 'ps5', 'ps4'],
      'tablet': ['ipad', 'tablet', 'kindle'],
      'camera': ['camera', 'dslr', 'mirrorless', 'lens'],
      'audio': ['speaker', 'headphone', 'earbud', 'soundbar', 'headset'],
      'furniture': ['chair', 'desk', 'table', 'sofa', 'bed', 'couch'],
      'appliance': ['refrigerator', 'washer', 'dryer', 'dishwasher', 'oven', 'microwave']
    };

    for (const [cat, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some(kw => titleLower.includes(kw))) {
        result.category = result.category || cat;
        break;
      }
    }

    return result;
  }

  /**
   * Parse description for specs and attributes
   */
  parseDescription(description) {
    const result = {
      specs: {},
      attributes: []
    };

    if (!description || description.length < 10) {
      return result;
    }

    const descLower = description.toLowerCase();

    // Spec extraction patterns
    const specPatterns = [
      { regex: /(?:cpu|processor)[:\s]*([^\n•,]+)/i, key: 'cpu' },
      { regex: /(?:gpu|graphics|video card)[:\s]*([^\n•,]+)/i, key: 'gpu' },
      { regex: /(?:ram|memory)[:\s]*([^\n•,]+)/i, key: 'ram' },
      { regex: /(?:storage|ssd|hdd|hard drive)[:\s]*([^\n•,]+)/i, key: 'storage' },
      { regex: /(?:screen|display)[:\s]*([^\n•,]+)/i, key: 'screenSize' },
      { regex: /(?:resolution)[:\s]*([^\n•,]+)/i, key: 'resolution' },
      { regex: /(?:refresh|hz)[:\s]*([^\n•,]+)/i, key: 'refreshRate' },
      { regex: /(?:year|model year)[:\s]*(\d{4})/i, key: 'year' },
      { regex: /(?:size|dimensions)[:\s]*([^\n•,]+)/i, key: 'size' },
      { regex: /(?:color|colour)[:\s]*([^\n•,]+)/i, key: 'color' },
      { regex: /(?:capacity|storage)[:\s]*([^\n•,]+)/i, key: 'capacity' }
    ];

    for (const pattern of specPatterns) {
      const match = description.match(pattern.regex);
      if (match) {
        const value = match[1].trim();
        if (value.length > 1 && value.length < 100) {
          result.specs[pattern.key] = value;
        }
      }
    }

    // Extract key attributes (features, conditions, etc.)
    const attributePatterns = [
      /(?:brand|manufacturer)[:\s]*([^\n•,]+)/i,
      /(?:model|series)[:\s]*([^\n•,]+)/i,
      /(?:condition)[:\s]*([^\n•,]+)/i,
      /(?:warranty|guarantee)[:\s]*([^\n•,]+)/i,
      /(?:includes|comes with)[:\s]*([^\n•,]+)/i,
      /(?:features|specs)[:\s]*([^\n•,]+)/i
    ];

    for (const pattern of attributePatterns) {
      const match = description.match(pattern);
      if (match) {
        const value = match[1].trim();
        if (value.length > 2 && value.length < 200) {
          result.attributes.push(value);
        }
      }
    }

    return result;
  }

  /**
   * Parse Facebook marketplace attributes
   */
  parseAttributes(attributes) {
    const result = {
      brand: null,
      model: null,
      specs: {}
    };

    if (!attributes || typeof attributes !== 'object') {
      return result;
    }

    // Map common attribute keys
    const keyMappings = {
      'Brand': 'brand',
      'Model': 'model',
      'Screen Size': 'screenSize',
      'Storage Capacity': 'storage',
      'RAM': 'ram',
      'Processor': 'cpu',
      'Graphics': 'gpu',
      'Year': 'year',
      'Color': 'color',
      'Size': 'size',
      'Condition': 'condition',
      'Type': 'type'
    };

    for (const [fbKey, ourKey] of Object.entries(keyMappings)) {
      const value = attributes[fbKey];
      if (value && typeof value === 'string') {
        if (ourKey === 'brand' || ourKey === 'model') {
          result[ourKey] = value;
        } else {
          result.specs[ourKey] = value;
        }
      }
    }

    return result;
  }

  /**
   * Calculate confidence score for textual analysis
   */
  calculateTextConfidence(listingData, analysisResult) {
    let confidence = 0;

    // Title quality
    if (listingData.title && listingData.title.length >= 10) {
      confidence += 0.2;
    }

    // Has description
    if (listingData.fullDescription && listingData.fullDescription.length >= 50) {
      confidence += 0.15;
    }

    // Has structured attributes
    if (listingData.attributes && Object.keys(listingData.attributes).length > 0) {
      confidence += 0.15;
    }

    // Has extracted specs
    if (Object.keys(analysisResult.specs).length > 0) {
      confidence += 0.2;
    }

    // Has brand
    if (analysisResult.brand) {
      confidence += 0.15;
    }

    // Has model
    if (analysisResult.model) {
      confidence += 0.15;
    }

    return Math.min(confidence, 1.0);
  }

  /**
   * Step 3: Merge visual and textual analyses into unified query
   * @param {Object} visualAnalysis - Result from image analysis
   * @param {Object} textualAnalysis - Result from text analysis
   * @param {Object} listingData - Original listing data
   * @returns {Object} Merged result with optimized query
   */
  mergeAnalyses(visualAnalysis, textualAnalysis, listingData) {
    const result = {
      query: '',
      confidence: 0,
      sources: [],
      fallbackUsed: false,
      mergedData: {
        brand: null,
        model: null,
        category: null,
        keyAttributes: [],
        specs: {}
      }
    };

    // Determine which sources to use based on confidence and availability
    const visualConfidence = visualAnalysis.success ? visualAnalysis.confidence : 0;
    const textualConfidence = textualAnalysis.confidence;

    // Brand selection: prefer visual if high confidence, otherwise textual
    if (visualAnalysis.brand && visualConfidence >= 0.6) {
      result.mergedData.brand = visualAnalysis.brand;
      result.sources.push('visual_brand');
    } else if (textualAnalysis.brand) {
      result.mergedData.brand = textualAnalysis.brand;
      result.sources.push('textual_brand');
    }

    // Model selection: prefer visual if high confidence, otherwise textual
    if (visualAnalysis.model && visualConfidence >= 0.6) {
      result.mergedData.model = visualAnalysis.model;
      result.sources.push('visual_model');
    } else if (textualAnalysis.model) {
      result.mergedData.model = textualAnalysis.model;
      result.sources.push('textual_model');
    }

    // Category selection
    if (visualAnalysis.category && visualConfidence >= 0.5) {
      result.mergedData.category = visualAnalysis.category;
      result.sources.push('visual_category');
    } else if (textualAnalysis.category) {
      result.mergedData.category = textualAnalysis.category;
      result.sources.push('textual_category');
    }

    // Merge key attributes (deduplicate)
    const allAttributes = new Set([
      ...(visualAnalysis.keyAttributes || []),
      ...(textualAnalysis.keyAttributes || [])
    ]);
    result.mergedData.keyAttributes = Array.from(allAttributes).slice(0, 5);

    // Merge specs (textual takes precedence for structured data)
    result.mergedData.specs = { ...textualAnalysis.specs };

    // Calculate overall confidence
    result.confidence = Math.max(visualConfidence, textualConfidence);

    // Generate optimized eBay search query
    result.query = this.buildOptimizedQuery(result.mergedData, listingData);

    // Determine if fallback was used
    if (!visualAnalysis.success && textualConfidence < 0.3) {
      result.fallbackUsed = true;
      result.sources.push('fallback_title');
    }

    return result;
  }

  /**
   * Build optimized eBay search query from merged data
   * @param {Object} mergedData - Merged analysis data
   * @param {Object} listingData - Original listing data
   * @returns {string} Optimized search query
   */
  buildOptimizedQuery(mergedData, listingData) {
    const queryParts = [];

    // Priority 1: Brand + Model (highest precision)
    if (mergedData.brand) {
      queryParts.push(mergedData.brand);
    }
    if (mergedData.model) {
      queryParts.push(mergedData.model);
    }

    // Priority 2: Category keyword (for context)
    if (mergedData.category) {
      const categoryKeywords = {
        'monitor': 'monitor',
        'computer': 'PC',
        'laptop': 'laptop',
        'phone': 'phone',
        'console': 'console',
        'tablet': 'tablet',
        'camera': 'camera',
        'audio': 'speaker',
        'furniture': 'furniture',
        'appliance': 'appliance'
      };
      const catKeyword = categoryKeywords[mergedData.category];
      if (catKeyword && !queryParts.includes(catKeyword)) {
        queryParts.push(catKeyword);
      }
    }

    // Priority 3: High-value specs (2-3 most important)
    const highValueSpecs = ['cpu', 'gpu', 'ram', 'storage', 'screenSize', 'year'];
    for (const specKey of highValueSpecs) {
      const value = mergedData.specs[specKey];
      if (value && !queryParts.some(p => p.toLowerCase().includes(value.toLowerCase()))) {
        // Clean spec value for search
        const cleanValue = this.cleanSpecValue(value);
        if (cleanValue) {
          queryParts.push(cleanValue);
        }
      }
      if (queryParts.length >= 5) break; // Limit query length
    }

    // Fallback: Use original title if we don't have enough structured data
    if (queryParts.length < 2) {
      const fallbackTitle = this.sanitizeTitle(listingData.title || '');
      if (fallbackTitle.length >= 5) {
        queryParts.push(fallbackTitle);
        result.sources.push('fallback_title');
      }
    }

    // Build final query
    let finalQuery = queryParts.join(' ').trim();

    // Enforce eBay query length limits (optimal: 50-80 chars)
    if (finalQuery.length > 80) {
      // Truncate intelligently - keep brand + model + 1-2 specs
      const essentialParts = [];
      if (mergedData.brand) essentialParts.push(mergedData.brand);
      if (mergedData.model) essentialParts.push(mergedData.model);
      if (mergedData.specs.cpu) essentialParts.push(mergedData.specs.cpu);
      if (essentialParts.length < 3 && mergedData.specs.gpu) {
        essentialParts.push(mergedData.specs.gpu);
      }
      finalQuery = essentialParts.join(' ').trim();
    }

    // Minimum query length check
    if (finalQuery.length < 5) {
      finalQuery = this.sanitizeTitle(listingData.title || 'item');
    }

    return finalQuery;
  }

  /**
   * Clean spec value for search query
   */
  cleanSpecValue(value) {
    if (!value) return '';
    return String(value)
      .replace(/\s+/g, ' ')
      .replace(/[()[\]{}]/g, '')
      .replace(/(?:GB|TB|Hz|inch|["']|GHz)/gi, '')
      .trim()
      .slice(0, 30);
  }

  /**
   * Sanitize title for fallback query
   */
  sanitizeTitle(title) {
    if (!title) return '';
    return String(title)
      .replace(/^(?:\(\d+\)\s*)?(?:facebook\s*)?marketplace\s*-\s*/i, '')
      .replace(/\s*\|\s*facebook\s*$/i, '')
      .replace(/\s*-\s*chromium\s*$/i, '')
      .replace(/\s*-\s*google\s*chrome\s*$/i, '')
      .replace(/\b(?:selling|for sale|obo|firm|no trades?|pickup only|free delivery|cash only)\b/gi, '')
      .replace(/[【】\[\](){}]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 60);
  }

  /**
   * Clear the analysis cache
   */
  clearCache() {
    this.cache.clear();
    console.log('[MultimodalIdentifier] Cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.entries()).map(([key, value]) => ({
        key,
        expiresAt: new Date(value.expiresAt).toISOString()
      }))
    };
  }
}

// Export singleton instance
export const multimodalIdentifier = new MultimodalIdentifier();
