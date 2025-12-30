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
  // Matches: Intel I9 9900k, Intel Core i9-9900K, Ryzen 7 5800X, R7 7800X3D, AMD 9700X, i9-11900k, etc.
  cpu: /(?:AMD\s+)?(?:Ryzen\s+)?[Rr][3579]\s+\d{4}[A-Z0-9]*|(?:AMD\s+)?Ryzen\s+[3579]\s+\d{4}[A-Z0-9]*|(?:Intel\s+)?(?:Core\s+)?i[3579][-\s]?\d{4,5}[A-Z]*|AMD\s+\d{4,5}[A-Z]*|Xeon\s+\w+[-\d]+|EPYC\s+\d+|Threadripper\s+\d+/gi,

  // GPU patterns - NVIDIA and AMD
  // Matches: RTX 3080, 3080Ti, EVGA 3080ti, GTX 1080, RX 6800 XT, Radeon RX 580, etc.
  // For standalone numbers (no RTX/GTX prefix), require brand prefix OR Ti/Super suffix
  gpu: /(?:NVIDIA\s+)?(?:GeForce\s+)?(?:RTX|GTX)\s*\d{3,4}(?:\s*Ti|\s*Super)?|(?:EVGA|ASUS|MSI|Gigabyte|Zotac|PNY)\s+\d{4}\s*(?:Ti|Super)?|\d{4}\s*(?:Ti|Super)|(?:AMD\s+)?(?:Radeon\s+)?RX\s*\d{3,4}(?:\s*XT)?|(?:Tesla|Quadro)\s+\w+\d+|A\d{2}0\d?/gi,

  // RAM patterns - DDR3/4/5 with capacity and speed
  // Matches: 32GB DDR4, 2x8GB DDR4 2400, 16GB RAM, DDR4 2X16(3600), 16x2, Corsair DDR4, etc.
  // Added: DDR before capacity format, formats like 2X16, 16x2
  ram: /\d+\s*[xX]\s*\d+\s*GB\s*DDR[345](?:[-\s@(]*\d{3,4})?|\d{1,3}\s*GB?\s*DDR[345](?:[-\s@(]*\d{3,4})?|DDR[345]\s*\d*[xX]?\d+(?:\s*GB)?(?:[-\s@(]*\d{3,4})?|\d{1,3}\s*GB\s+RAM|\d{1,2}\s*[xX]\s*\d{1,2}(?=\s|$|[,\n])/gi,

  // Storage patterns - SSD, HDD, NVMe with capacity
  // Matches: 2TB NVMe, 1TB SSD, 500GB M.2, 980 Pro 1TB, Samsung 970 Evo 2TB, etc.
  // Added: model name before capacity (980 Pro, 970 Evo, etc.)
  storage: /\d+\s*(?:TB|GB)\s*(?:SSD|HDD|NVMe|M\.?2|SATA|Gen\s*\d)|(?:980\s*Pro|970\s*Evo|870\s*Evo|860\s*Evo|SN\d{3}|P\d{1,2}|Firecuda|Barracuda)\s*\d+\s*(?:TB|GB)(?:\s*[xX]\s*\d+)?|\d+\s*(?:TB|GB)\s*[xX]\s*\d+/gi,

  // PSU patterns - wattage
  // Matches: 850W, 850w Gold, PSU 750W, Corsair 850W PSU, etc.
  psu: /\d{3,4}\s*[Ww](?:att)?(?:\s*(?:Gold|Bronze|Platinum|Titanium|80\+|Plus))?(?:\s*PSU)?|(?:PSU|Power\s+Supply)\s*[-:]?\s*\d{3,4}\s*[Ww]/gi,

  // Motherboard patterns - Intel/AMD chipsets
  // Matches: Z590, B650, X570, H670, ROG Maximus XIII Hero Z590, etc.
  // MUST include chipset identifier (Z/X/H/B + 3 digits)
  motherboard: /(?:ROG\s+)?(?:Maximus|Strix|Crosshair)\s+(?:XIII|XII|XI|X|Hero|Extreme)?\s*[ZXHBzxhb]\d{3}|(?:TUF|Prime|MAG|AORUS|Taichi)\s+(?:Gaming\s+)?[ZXHBzxhb]\d{3}|(?:Asrock|ASUS|Gigabyte|MSI|Biostar)\s+[ZXHBzxhb]\d{3}|[ZXHBzxhb]\d{3}(?:\s+(?:Pro|Plus|Gaming|Elite|Wifi|AX))?/gi,

  // Case patterns - specific model patterns to avoid over-matching
  // Matches: NZXT H510, Corsair 4000D, Hyte Y40, Lian Li O11, etc.
  case: /(?:NZXT)\s+[HhSs]\d{3,4}\w?|(?:Corsair)\s+\d{4}[DdXx]?|(?:Fractal)\s+(?:Design\s+)?(?:Define|Meshify|Pop|North)\s*\w*|(?:Lian\s*Li)\s+(?:O\d{2}|Lancool)\w*|(?:Phanteks)\s+(?:Eclipse|Enthoo|Evolv)\s*\w*|(?:Cooler\s*Master)\s+(?:MasterBox|MasterCase|H500)\w*|(?:be\s*quiet!?)\s+(?:Pure|Silent|Dark)\s*Base\s*\w*|(?:Hyte)\s+[Yy]\d{2}\w?/gi,

  // Cooling patterns - AIO and air coolers (specific models)
  // Matches: 360mm AIO, Noctua NH-D15, Corsair elite 360, Kraken X63, liquid cooling, etc.
  cooling: /\d{2,3}\s*mm\s*(?:AIO|Liquid|Water)(?:\s*Cool(?:er|ing)?)?|(?:Noctua)\s+NH[-]?[A-Z]?\d+\w*|(?:Corsair)\s+(?:H\d{2,3}i?|[Ee]lite\s+\d{3})|(?:NZXT)\s+(?:Kraken)\s*[XZ]?\d*|(?:be\s*quiet!?)\s+(?:Pure|Dark)\s*Rock\s*\w*|(?:Thermalright)\s+(?:Peerless|Assassin)\s*\w*|(?:liquid|water)\s+cool(?:ing|er)/gi,
};

// Post-process extracted components to clean up and validate
function cleanExtractedComponents(components: ExtractedComponents): ExtractedComponents {
  const cleaned: ExtractedComponents = {};

  for (const [type, values] of Object.entries(components)) {
    if (!values || values.length === 0) continue;

    // Filter out values that are too short or clearly wrong
    const filtered = values.filter((v: string) => {
      const val = v.trim();
      if (val.length < 3) return false;

      // For RAM, filter out standalone numbers like "16x2" that might be mismatched
      if (type === 'ram' && /^\d+\s*[xX]\s*\d+$/.test(val)) {
        // Only keep if it looks like RAM capacity (e.g., 16x2 = 32GB total makes sense)
        const match = val.match(/(\d+)\s*[xX]\s*(\d+)/);
        if (match) {
          const [, a, b] = match;
          const total = parseInt(a) * parseInt(b);
          // Common RAM totals: 16, 32, 64, 128
          if (![16, 32, 64, 128, 8].includes(total)) return false;
        }
      }

      return true;
    });

    if (filtered.length > 0) {
      cleaned[type as keyof ExtractedComponents] = filtered;
    }
  }

  return cleaned;
}

// High-end GPU models for tier estimation (now matches with or without RTX prefix)
const HIGH_END_GPU_PATTERNS = /(?:RTX\s*)?40[789]0|(?:RTX\s*)?30[789]0\s*Ti?|RX\s*7[89]00|RX\s*6[89]00/i;
const MID_RANGE_GPU_PATTERNS = /(?:RTX\s*)?40[56]0|(?:RTX\s*)?30[56]0|(?:RTX\s*)?20[678]0|RX\s*7[67]00|RX\s*6[67]00|RX\s*5[67]00/i;

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

    // Apply post-processing cleanup
    return cleanExtractedComponents(components);
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

