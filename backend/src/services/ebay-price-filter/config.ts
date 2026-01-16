/**
 * eBay Price Filter Configuration
 * Component-specific configurations for accurate price matching
 */

import { ComponentFilterConfig, ComponentType, EbayCondition } from './types';

// Common exclusion keywords that indicate non-working or partial items
export const COMMON_EXCLUSION_KEYWORDS = [
  // Condition issues
  'for parts', 'not working', 'broken', 'as-is', 'as is', 'defective',
  'faulty', 'dead', 'untested', 'powers on only', 'no display',
  'damaged', 'bent pins', 'cracked', 'water damage', 'burnt',

  // Partial items
  'box only', 'manual only', 'cable only', 'bracket only', 'cables only',
  'mounting only', 'backplate only', 'shroud only', 'heatsink only',
  'fan only', 'fans only', 'cooler only', 'coolers only',
  'shell only', 'cover only', 'case only', 'housing only',
  'io shield only', 'accessories only', 'parts only',

  // Bundles/lots (often skewed pricing - CRITICAL for accurate single-item pricing)
  'lot of', 'lots of', 'bundle of', 'bulk lot', 'wholesale lot',
  'grab bag', 'mystery box', 'random',
  'x lot', 'pc lot', 'mixed lot', 'assorted lot',
  '2x', '3x', '4x', '5x', '6x', '8x', '10x',  // Multiple quantity indicators
  'qty 2', 'qty 3', 'qty 4', 'qty 5', 'qty:',
  'set of 2', 'set of 3', 'set of 4', 'pack of',
  'pair of', 'pairs',

  // Replacement parts
  'replacement fan', 'replacement cooler', 'replacement shroud',
  'replacement heatsink', 'thermal pads only',

  // Non-product listings
  'wanted', 'wtb', 'looking for', 'iso',
];

// Keywords that indicate a combo/bundle with multiple components
export const COMBO_BUNDLE_KEYWORDS = [
  // Explicit combos
  'combo', 'bundle', 'kit', 'set',
  // Multiple components
  'cpu + motherboard', 'motherboard + cpu', 'cpu+motherboard', 'motherboard+cpu',
  'with motherboard', 'with mobo', 'with ram', 'with memory', 'with cooler',
  'and motherboard', 'and mobo', 'and ram', 'and memory',
  '+ mobo', '+ motherboard', '+ ram', '+ memory',
  // Complete systems
  'gaming pc', 'desktop pc', 'computer', 'full system', 'complete system',
  'build', 'custom build', 'gaming build', 'pc build',
  'workstation', 'mini pc', 'sff pc',
  // Part-out language
  'parting out', 'part out', 'from pc', 'from system', 'pulled from',
];

// Patterns that suggest the item might be an accessory, not the main product
export const ACCESSORY_PATTERNS = [
  /^(replacement|spare|extra)\s+/i,
  /\bfan\s+(replacement|for|fits)\b/i,
  /\bheatsink\s+(for|fits|compatible)\b/i,
  /\bcooler\s+(for|fits|compatible)\b/i,
  /\(fan only\)/i,
  /\bno\s+(gpu|card|chip)\b/i,
  /\bshroud\s+only\b/i,
  /\bbackplate\s+only\b/i,
];

// Patterns that indicate lot/bulk listings (often in parentheses on eBay)
export const LOT_PATTERNS = [
  /\(lot\s*(of)?\s*\d+\)/i,           // (lot of 5), (lot 10)
  /\(x\s*\d+\)/i,                      // (x5), (x 10)
  /\(\d+\s*x\)/i,                      // (5x), (10 x)
  /\(\d+\s*(pcs?|pieces?|units?)\)/i,  // (5 pcs), (10 pieces)
  /\(\d+\s*lot\)/i,                    // (5 lot)
  /\bx\s*\d+\b/i,                      // x5, x 10
  /\b\d+\s*x\s+[a-z]/i,                // 5x Intel, 10x AMD (quantity prefix)
  /\blot\s+of\s+\d+/i,                 // lot of 5
  /\b\d+\s*-?\s*lot\b/i,               // 5 lot, 5-lot
  /\b\d+\s*(pcs?|pieces?|units?)\b/i,  // 5 pcs, 10 pieces
  /\bqty[\s:]*\d+/i,                   // qty: 5, qty 10
  /\bmixed\s+lot\b/i,                  // mixed lot
  /\bassorted\s+lot\b/i,               // assorted lot
  /\bbulk\b/i,                         // bulk
  /\bwholesale\b/i,                    // wholesale
];

// Standard allowed conditions (excludes "For Parts")
export const STANDARD_CONDITIONS: EbayCondition[] = [
  'NEW',
  'OPEN_BOX',
  'CERTIFIED_REFURBISHED',
  'EXCELLENT_REFURBISHED',
  'VERY_GOOD_REFURBISHED',
  'GOOD_REFURBISHED',
  'SELLER_REFURBISHED',
  'USED_EXCELLENT',
  'USED_VERY_GOOD',
  'USED_GOOD',
  'USED_ACCEPTABLE',
];

// GPU-specific configuration
export const GPU_CONFIG: ComponentFilterConfig = {
  componentType: 'GPU',
  minPrice: 40,  // Budget/older GPUs like RX580 can be around $50-70
  maxPrice: 2500,  // High-end GPUs (reduced from 3500)
  ebayCategories: ['27386', '175673'],  // Video cards, Computer Components
  requiredKeywords: [],  // Handled by model matching
  excludePatterns: [
    ...ACCESSORY_PATTERNS,
    /\bblower\s+fan\b/i,  // Just the blower fan
    /\bthermal\s+paste\b/i,
    /\bgpu\s+support\b/i,  // GPU support bracket
    /\bgpu\s+brace\b/i,
    /\bvertical\s+mount\b/i,  // GPU vertical mounts
    /\briser\s+(cable|card)\b/i,
    /\bmining\s+rig\b/i,
    /\bfor\s+mining\b/i,
    // Combo/system patterns
    /\bgaming\s*(pc|build|system|computer)\b/i,
    /\bdesktop\s*(pc|computer|system)\b/i,
    /\bcomplete\s*(system|build|pc)\b/i,
    /\bcombo\b/i,
    /\bbundle\b/i,
  ],
  excludeKeywords: [
    ...COMMON_EXCLUSION_KEYWORDS,
    'waterblock', 'water block', 'ek block',  // Water cooling blocks only
    'bios mod', 'bios flash', 'modded bios',
    'gaming pc', 'desktop pc', 'full system', 'complete system',
  ],
  minRelevanceScore: 0.40,  // Slightly increased
  allowedConditions: STANDARD_CONDITIONS,
  typicalPriceRanges: {
    budget: { min: 40, max: 150 },      // RX 580, GT/GTX 10xx series, older
    midRange: { min: 100, max: 400 },   // RTX 30 series lower tier, RX 6xxx
    highEnd: { min: 300, max: 1500 },   // RTX 40 series, high-end
  },
};

// CPU-specific configuration
export const CPU_CONFIG: ComponentFilterConfig = {
  componentType: 'CPU',
  minPrice: 30,  // Budget CPUs
  maxPrice: 500,  // Cap at $500 - most desktop CPUs don't exceed this on resale (even i9/Ryzen 9)
  ebayCategories: ['164', '175673'],  // CPUs/Processors, Computer Components
  requiredKeywords: [],
  excludePatterns: [
    /\bdelidded\b/i,  // Modified CPUs
    /\bheat\s*spreader\s*only\b/i,
    /\bihs\s*only\b/i,  // Integrated heat spreader only
    /\bno\s+ihs\b/i,  // CPU without heat spreader
    /\bkeychain\b/i,  // Decorative items
    /\blaptop\s+cpu\b/i,  // Mobile processors (different pricing)
    // Combo/bundle patterns - these indicate multiple parts
    /\bcpu\s*\+\s*(motherboard|mobo|ram|memory)/i,
    /\b(motherboard|mobo)\s*\+\s*cpu\b/i,
    /\bwith\s+(motherboard|mobo|ram|memory|cooler)\b/i,
    /\band\s+(motherboard|mobo|ram|memory)\b/i,
    /\bcombo\b/i,
    /\bbundle\b/i,
    /\bkit\b/i,
    /\bgaming\s*(pc|build|system|computer)\b/i,
    /\bdesktop\s*(pc|computer|system)\b/i,
    /\bcomplete\s*(system|build|pc)\b/i,
    /\bfull\s*(system|build|pc)\b/i,
    /\bcustom\s*(build|pc|system)\b/i,
    /\bworkstation\b/i,
    /\bmini\s*pc\b/i,
    /\bsff\s*(pc|build)\b/i,
  ],
  excludeKeywords: [
    ...COMMON_EXCLUSION_KEYWORDS,
    ...COMBO_BUNDLE_KEYWORDS,
    'tray only', 'oem tray',
    'es sample', 'engineering sample', 'qs sample',  // Engineering samples
    'delid tool', 'delidding',
  ],
  minRelevanceScore: 0.50,  // Increased from 0.40 - be stricter for CPUs
  allowedConditions: STANDARD_CONDITIONS,
  typicalPriceRanges: {
    budget: { min: 30, max: 100 },      // i3/Ryzen 3, older i5s like 11400F
    midRange: { min: 80, max: 200 },    // i5/Ryzen 5 current gen
    highEnd: { min: 150, max: 400 },    // i7/i9/Ryzen 7/9
  },
};

// RAM-specific configuration  
export const RAM_CONFIG: ComponentFilterConfig = {
  componentType: 'RAM',
  minPrice: 15,  // Cheap RAM sticks
  maxPrice: 500,  // High-end kits
  ebayCategories: ['170083', '175673'],  // Memory (RAM), Computer Components
  requiredKeywords: [],
  excludePatterns: [
    /\blaptop\s+(?:memory|ram)\b/i,  // SODIMM
    /\bso-?dimm\b/i,
    /\bserver\s+ram\b/i,  // Server RAM (different pricing)
    /\becc\s+ram\b/i,
    /\bregistered\b/i,
    /\bheatspreader\s+only\b/i,
  ],
  excludeKeywords: [
    ...COMMON_EXCLUSION_KEYWORDS,
    'rgb dummy', 'light bar',  // Decorative RAM
    'single stick',  // Usually want pairs
  ],
  minRelevanceScore: 0.35,
  allowedConditions: STANDARD_CONDITIONS,
  typicalPriceRanges: {
    budget: { min: 15, max: 50 },
    midRange: { min: 40, max: 120 },
    highEnd: { min: 100, max: 400 },
  },
};

// Storage-specific configuration
export const STORAGE_CONFIG: ComponentFilterConfig = {
  componentType: 'STORAGE',
  minPrice: 20,
  maxPrice: 800,
  ebayCategories: ['56083', '175669'],  // SSDs, HDDs
  requiredKeywords: [],
  excludePatterns: [
    /\bexternal\s+(?:drive|hdd|ssd)\b/i,  // External drives
    /\bportable\s+(?:drive|hdd|ssd)\b/i,
    /\benclosure\b/i,  // Drive enclosures
    /\bcaddy\b/i,
    /\bdocking\b/i,
  ],
  excludeKeywords: [
    ...COMMON_EXCLUSION_KEYWORDS,
    'bad sectors', 'smart warning', 'health warning',
    'reallocated sectors', 'pending sectors',
  ],
  minRelevanceScore: 0.35,
  allowedConditions: STANDARD_CONDITIONS,
  typicalPriceRanges: {
    budget: { min: 20, max: 60 },
    midRange: { min: 50, max: 150 },
    highEnd: { min: 100, max: 500 },
  },
};

// PSU-specific configuration
export const PSU_CONFIG: ComponentFilterConfig = {
  componentType: 'PSU',
  minPrice: 30,
  maxPrice: 400,
  ebayCategories: ['42017', '175673'],  // Power Supplies, Components
  requiredKeywords: [],
  excludePatterns: [
    /\bserver\s+psu\b/i,
    /\bmining\s+psu\b/i,
    /\bcables?\s+only\b/i,
    /\bmodular\s+cables?\b/i,  // Just the cables
    /\bextension\b/i,
    /\bsleeved\s+cables?\b/i,
  ],
  excludeKeywords: [
    ...COMMON_EXCLUSION_KEYWORDS,
    'cable kit', 'cable set', 'cable mod',
    'psu tester',
  ],
  minRelevanceScore: 0.35,
  allowedConditions: STANDARD_CONDITIONS,
  typicalPriceRanges: {
    budget: { min: 30, max: 80 },
    midRange: { min: 70, max: 150 },
    highEnd: { min: 120, max: 350 },
  },
};

// Motherboard-specific configuration
export const MOTHERBOARD_CONFIG: ComponentFilterConfig = {
  componentType: 'MOTHERBOARD',
  minPrice: 40,
  maxPrice: 800,
  ebayCategories: ['1244', '175673'],  // Motherboards, Components
  requiredKeywords: [],
  excludePatterns: [
    /\bserver\s+motherboard\b/i,
    /\blaptop\s+motherboard\b/i,
    /\bio\s+shield\s+only\b/i,
    /\bbios\s+chip\b/i,
    /\bvrm\s+heatsink\b/i,
  ],
  excludeKeywords: [
    ...COMMON_EXCLUSION_KEYWORDS,
    'io shield only', 'bios chip only',
    'socket cover', 'cpu cover',
  ],
  minRelevanceScore: 0.40,
  allowedConditions: STANDARD_CONDITIONS,
  typicalPriceRanges: {
    budget: { min: 40, max: 120 },
    midRange: { min: 100, max: 250 },
    highEnd: { min: 200, max: 600 },
  },
};

// Generic fallback configuration
export const GENERIC_CONFIG: ComponentFilterConfig = {
  componentType: 'GENERIC',
  minPrice: 5,
  maxPrice: 5000,
  ebayCategories: ['175673'],  // Computer Components
  requiredKeywords: [],
  excludePatterns: ACCESSORY_PATTERNS,
  excludeKeywords: COMMON_EXCLUSION_KEYWORDS,
  minRelevanceScore: 0.25,
  allowedConditions: STANDARD_CONDITIONS,
  typicalPriceRanges: {
    budget: { min: 5, max: 100 },
    midRange: { min: 50, max: 300 },
    highEnd: { min: 200, max: 2000 },
  },
};

// Cooling-specific configuration (AIOs, tower coolers)
export const COOLING_CONFIG: ComponentFilterConfig = {
  componentType: 'COOLING',
  minPrice: 20,
  maxPrice: 400,
  ebayCategories: ['42000', '175673'],  // CPU Fans & Heatsinks, Components
  requiredKeywords: [],
  excludePatterns: [
    /\bfan\s+only\b/i,  // Just the fan, no radiator/pump
    /\bpump\s+only\b/i,  // Just the pump
    /\bradiator\s+only\b/i,  // Just the radiator
    /\bmounting\s+kit\b/i,
    /\bbracket\s+only\b/i,
    /\bthermal\s+paste\b/i,
    /\breplacement\s+fan\b/i,
  ],
  excludeKeywords: [
    ...COMMON_EXCLUSION_KEYWORDS,
    'fan only', 'pump only', 'radiator only',
    'mounting hardware', 'bracket kit',
    'replacement part',
  ],
  minRelevanceScore: 0.35,
  allowedConditions: STANDARD_CONDITIONS,
  typicalPriceRanges: {
    budget: { min: 20, max: 60 },    // Basic air coolers
    midRange: { min: 50, max: 150 }, // Good air coolers, budget AIOs
    highEnd: { min: 100, max: 350 }, // Premium AIOs (Kraken X63, H150i)
  },
};

// Configuration map by component type
export const COMPONENT_CONFIGS: Record<ComponentType, ComponentFilterConfig> = {
  GPU: GPU_CONFIG,
  CPU: CPU_CONFIG,
  RAM: RAM_CONFIG,
  STORAGE: STORAGE_CONFIG,
  PSU: PSU_CONFIG,
  MOTHERBOARD: MOTHERBOARD_CONFIG,
  CASE: { ...GENERIC_CONFIG, componentType: 'CASE', minPrice: 30, maxPrice: 500 },
  COOLING: COOLING_CONFIG,
  MONITOR: { ...GENERIC_CONFIG, componentType: 'MONITOR', minPrice: 50, maxPrice: 2000 },
  PERIPHERAL: { ...GENERIC_CONFIG, componentType: 'PERIPHERAL', minPrice: 10, maxPrice: 500 },
  GENERIC: GENERIC_CONFIG,
};

/**
 * Get configuration for a component type
 */
export function getComponentConfig(type?: ComponentType | string): ComponentFilterConfig {
  if (!type) return GENERIC_CONFIG;

  const upperType = type.toUpperCase() as ComponentType;
  return COMPONENT_CONFIGS[upperType] || GENERIC_CONFIG;
}

/**
 * Map lowercase component types from ExtractedComponents to ComponentType
 */
export function mapComponentType(type: string): ComponentType {
  const mapping: Record<string, ComponentType> = {
    gpu: 'GPU',
    cpu: 'CPU',
    ram: 'RAM',
    storage: 'STORAGE',
    psu: 'PSU',
    motherboard: 'MOTHERBOARD',
    case: 'CASE',
    cooling: 'COOLING',
  };
  return mapping[type.toLowerCase()] || 'GENERIC';
}

