/**
 * Component Extractor Service
 * Extracts PC component specifications from listing titles and descriptions
 * using regex pattern matching for CPUs, GPUs, RAM, storage, PSUs, motherboards, etc.
 */

export interface ExtractedComponents {
  cpu?: string[];
  gpu?: string[];
  ram?: string[];
  storage?: string[];
  psu?: string[];
  motherboard?: string[];
  case?: string[];
  cooling?: string[];
}

export interface ComponentProfile {
  rawComponents: ExtractedComponents;
  rawTitle: string;
  estimatedTier: 'budget' | 'mid-range' | 'high-end' | 'unknown';
  missingSpecs: string[];
}

// Regex patterns for PC component detection
const COMPONENT_PATTERNS: Record<string, RegExp> = {
  // CPU patterns - AMD Ryzen and Intel Core series
  // Matches: Intel I9 9900k, Intel Core i9-9900K, Ryzen 7 5800X, AMD 9700X, etc.
  cpu: /(?:AMD\s+)?Ryzen\s+[3579]\s+\d{4}[A-Z]*|(?:Intel\s+)?(?:Core\s+)?i[3579][-\s]?\d{4,5}[A-Z]*|AMD\s+\d{4,5}[A-Z]*|Xeon\s+\w+[-\d]+|EPYC\s+\d+|Threadripper\s+\d+/gi,

  // GPU patterns - NVIDIA and AMD
  // Matches: RTX 3080, GeForce GTX 1080, RX 6800 XT, Radeon RX 580, etc.
  gpu: /(?:NVIDIA\s+)?(?:GeForce\s+)?(?:RTX|GTX)\s*\d{3,4}(?:\s*Ti|\s*Super)?|(?:AMD\s+)?(?:Radeon\s+)?RX\s*\d{3,4}(?:\s*XT)?|(?:Tesla|Quadro)\s+\w+\d+|A\d{2}0\d?/gi,

  // RAM patterns - DDR3/4/5 with capacity and speed
  // Matches: 32GB DDR4, 2x8GB DDR4 2400, 16GB RAM, 32GB DDR5 RAM, etc.
  ram: /(\d+)\s*x?\s*(\d+)\s*GB\s*DDR[345](?:[-\s]*\d{3,4})?|(\d{1,3})\s*GB?\s*(?:DDR[345])(?:[-\s]*(\d{3,4})\s*(?:MHz)?)?|\d{1,3}\s*GB\s+RAM/gi,

  // Storage patterns - SSD, HDD, NVMe with capacity
  storage: /(\d+)\s*(?:TB|GB)\s*(?:SSD|HDD|NVMe|M\.2|SATA)/gi,

  // PSU patterns - wattage
  psu: /(\d{3,4})\s*W(?:att)?\s*(?:PSU|Power\s+Supply)?|(?:PSU|Power\s+Supply)\s*[-:]?\s*(\d{3,4})\s*W/gi,

  // Motherboard patterns - Intel/AMD chipsets and brand names
  // Matches: Z390, Asrock Z390, B550, ROG Strix, TUF Gaming, etc.
  motherboard: /(?:Asrock|ASUS|Gigabyte|MSI|EVGA|Biostar)?\s*(?:[ZXHBz]\d{2,3}[A-Z]?)(?:[-\s]?(?:Phantom|Gaming|M\.?2|DDR\d|Pro|Elite|Strix|Plus|\w+))*|(?:MAG|ROG|TUF|Prime|AORUS|Strix)\s+[\w\s]+/gi,

  // Case patterns
  case: /(?:NZXT|Corsair|Fractal|Lian\s*Li|Phanteks|Cooler\s*Master|be\s*quiet!?)\s+[\w\s]+(?:Tower|Case|ATX)/gi,

  // Cooling patterns - AIO and air coolers
  cooling: /(?:AIO|All[-\s]?in[-\s]?One)\s*\d{2,3}\s*mm|(?:Noctua|Corsair|NZXT|be\s*quiet!?|Kraken|iCUE)\s+\w+(?:[-\s]\w+)?|(?:\d{2,3}mm\s+)?(?:Liquid|Water)\s*Cool(?:er|ing)?/gi,
};

// High-end GPU models for tier estimation
const HIGH_END_GPU_PATTERNS = /RTX\s*40[789]0|RTX\s*30[789]0|RX\s*7[89]00|RX\s*6[89]00/i;
const MID_RANGE_GPU_PATTERNS = /RTX\s*40[56]0|RTX\s*30[56]0|RTX\s*20[678]0|RX\s*7[67]00|RX\s*6[67]00|RX\s*5[67]00/i;

export class ComponentExtractorService {
  /**
   * Extract PC components from text using regex patterns
   */
  extractComponents(title: string, description: string = ''): ExtractedComponents {
    const combinedText = `${title} ${description}`.toUpperCase();
    const components: ExtractedComponents = {};

    for (const [componentType, pattern] of Object.entries(COMPONENT_PATTERNS)) {
      const matches = combinedText.match(pattern);
      if (matches && matches.length > 0) {
        // Clean and deduplicate matches
        const cleanedMatches = [...new Set(
          matches.map(m => m.trim().replace(/\s+/g, ' '))
        )];
        components[componentType as keyof ExtractedComponents] = cleanedMatches;
      }
    }

    return components;
  }

  /**
   * Build a detailed component profile from a listing
   */
  buildComponentProfile(listing: { title: string; description?: string }): ComponentProfile {
    const title = listing.title || '';
    const description = listing.description || '';
    
    const components = this.extractComponents(title, description);
    
    return {
      rawComponents: components,
      rawTitle: title,
      estimatedTier: this.estimateTier(components),
      missingSpecs: this.identifyMissingSpecs(components),
    };
  }

  /**
   * Estimate PC tier based on detected components
   */
  private estimateTier(components: ExtractedComponents): 'budget' | 'mid-range' | 'high-end' | 'unknown' {
    const gpus = components.gpu || [];
    
    if (gpus.length === 0) {
      return 'unknown';
    }

    const gpuString = gpus.join(' ').toUpperCase();

    if (HIGH_END_GPU_PATTERNS.test(gpuString)) {
      return 'high-end';
    }
    
    if (MID_RANGE_GPU_PATTERNS.test(gpuString)) {
      return 'mid-range';
    }

    return 'budget';
  }

  /**
   * Identify missing critical specs
   */
  private identifyMissingSpecs(components: ExtractedComponents): string[] {
    const requiredSpecs = ['cpu', 'gpu', 'ram', 'storage'];
    const missing: string[] = [];

    for (const spec of requiredSpecs) {
      const value = components[spec as keyof ExtractedComponents];
      if (!value || value.length === 0) {
        missing.push(spec);
      }
    }

    return missing;
  }

  /**
   * Check if a listing likely contains a full PC build
   */
  isPcBuildListing(title: string, description: string = ''): boolean {
    const combinedText = `${title} ${description}`.toLowerCase();
    
    // Keywords indicating a full PC build
    const pcKeywords = [
      'full pc', 'gaming pc', 'gaming rig', 'custom build', 'custom pc',
      'desktop tower', 'computer build', 'pc build', 'gaming computer',
      'full build', 'complete build', 'gaming setup', 'workstation',
      'desktop computer', 'tower pc'
    ];

    const hasKeyword = pcKeywords.some(kw => combinedText.includes(kw));
    
    // Also check if multiple components are mentioned
    const components = this.extractComponents(title, description);
    const componentTypes = Object.keys(components).filter(
      k => components[k as keyof ExtractedComponents]?.length
    );
    
    // If 3+ component types are mentioned, likely a PC build
    return hasKeyword || componentTypes.length >= 3;
  }
}

