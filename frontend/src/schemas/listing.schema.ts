import { z } from 'zod';

/**
 * Categories for listings
 */
export const LISTING_CATEGORIES = [
  'Apparel & Accessories',
  'Electronics',
  'Home & Garden',
  'Automotive',
  'Beauty & Personal Care',
  'Books & Media',
  'Sports & Outdoors',
  'Toys & Hobbies',
  'Food & Beverage',
  'Health & Wellness',
  'Pets & Supplies',
  'Business & Office',
  'Art & Collectibles',
  'Miscellaneous'
] as const;

/**
 * Target platforms for listings
 */
export const TARGET_PLATFORMS = [
  'facebook',
  'craigslist',
  'offerup',
  'nextdoor',
  'mercari'
] as const;

/**
 * Condition options for listings
 */
export const LISTING_CONDITIONS = [
  'new',
  'like_new',
  'good',
  'fair',
  'poor'
] as const;

/**
 * Location information interface
 */
export const LocationSchema = z.object({
  address: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  zipCode: z.string()
    .min(5, 'ZIP code must be at least 5 characters')
    .max(10, 'ZIP code must be no more than 10 characters')
    .regex(/^[0-9-]+$/, 'ZIP code must contain only numbers and dashes'),
  distance: z.number().min(1).max(100).default(5),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

/**
 * Main listing form data schema with multi-step validation
 */
export const ListingFormSchema = z.object({
  // Step 1: Basic Info
  title: z.string()
    .min(3, 'Title must be at least 3 characters')
    .max(100, 'Title must be no more than 100 characters')
    .trim(),
  price: z.number()
    .positive('Price must be greater than 0')
    .max(999999.99, 'Price must be less than $999,999.99')
    .refine((val) => {
      const parts = val.toString().split('.');
      return parts.length === 1 || parts[1].length <= 2;
    }, {
      message: 'Price can have at most 2 decimal places',
    }),
  category: z.enum(LISTING_CATEGORIES, 'Please select a category'),
  condition: z.enum(LISTING_CONDITIONS, 'Please select a condition'),

  // Step 2: Description & Images
  description: z.string()
    .optional()
    .refine((val) => !val || val.length >= 10, {
      message: 'Description must be at least 10 characters (if provided)',
    })
    .refine((val) => !val || val.length <= 2000, {
      message: 'Description must be no more than 2,000 characters',
    }),
  images: z.array(z.instanceof(File))
    .min(1, 'At least one image is required')
    .max(10, 'Maximum 10 images allowed')
    .refine(
      (files) => files.every((file) => file.size <= 5 * 1024 * 1024),
      'Each image must be no larger than 5MB'
    )
    .refine(
      (files) => files.every((file) =>
        ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)
      ),
      'Only JPEG, PNG, WebP, and GIF images are allowed'
    ),

  // Step 3: Location
  location: LocationSchema,

  // Step 4: Platform Selection
  platforms: z.array(z.enum(TARGET_PLATFORMS))
    .min(1, 'Please select at least one platform')
    .default(['facebook']),
}).refine(
  (data) => {
    // Custom validation: premium items (>$1000) must have detailed descriptions
    if (data.price >= 1000 && data.description && data.description.length < 50) {
      return false;
    }
    return true;
  },
  {
    message: 'Items priced at $1000+ require a description of at least 50 characters',
    path: ['description'],
  }
);

/**
 * Draft form data schema (partial validation for saving progress)
 */
export const DraftListingFormSchema = ListingFormSchema.partial().extend({
  currentStep: z.number().min(1).max(4),
  lastSaved: z.date(),
});

/**
 * Form step configuration types
 */
export type FormStep = 1 | 2 | 3 | 4;

export type StepConfig = {
  number: FormStep;
  title: string;
  description: string;
  isCompleted: boolean;
  isActive: boolean;
};

/**
 * Type inference from Zod schema
 */
export type ListingFormData = z.infer<typeof ListingFormSchema>;
export type DraftListingFormData = z.infer<typeof DraftListingFormSchema>;
export type LocationData = z.infer<typeof LocationSchema>;

/**
 * Form validation helpers
 */
export const validateFormStep = (
  data: Partial<ListingFormData>,
  step: FormStep
): { [key: string]: z.ZodIssue | undefined } => {
  const stepSchemas = {
    1: ListingFormSchema.pick({
      images: true,
    }),
    2: ListingFormSchema.pick({
      title: true,
      price: true,
      category: true,
      condition: true,
      description: true,
    }),
    3: ListingFormSchema.pick({
      location: true,
    }),
    4: ListingFormSchema.pick({
      platforms: true,
    }),
  };

  const result = stepSchemas[step].safeParse(data);
  
  if (result.success) {
    return {};
  } else {
    const errors: { [key: string]: z.ZodIssue | undefined } = {};
    result.error.issues.forEach((issue) => {
      errors[issue.path.join('.')] = issue;
    });
    return errors;
  }
};

/**
 * Form validation error messages
 */
export const getErrorMessage = (error?: z.ZodIssue): string => {
  if (!error) return '';
  
  switch (error.code) {
    case 'too_small':
      if (error.minimum === 1) return 'This field is required';
      return `${error.path.join('.')} must be at least ${error.minimum} characters`;
    case 'too_big':
      return `${error.path.join('.')} must be no more than ${error.maximum} characters`;
    case 'invalid_type':
      return `Invalid ${error.path.join('.')} format`;
    case 'invalid_value':
      return `Please select a valid option for ${error.path.join('.')}`;
    case 'invalid_format':
      return `${error.path.join('.')} format is invalid`;
    case 'custom':
      return error.message;
    default:
      return error.message;
  }
};

/**
 * Default values for form initialization
 */
export const getDefaultValues = (): Partial<ListingFormData> => ({
  title: '',
  description: '',
  price: 0,
  category: undefined,
  condition: undefined,
  images: [],
  location: {
    address: '',
    city: '',
    state: '',
    zipCode: '',
    distance: 5,
    latitude: undefined,
    longitude: undefined,
  },
  platforms: ['facebook'],
});

/**
 * Validation for individual fields
 */
export const FieldValidation = {
  title: (value: string) => {
    if (!value.trim()) return 'Title is required';
    if (value.length < 3) return 'Title must be at least 3 characters';
    if (value.length > 100) return 'Title must be no more than 100 characters';
    return null;
  },

  price: (value: number) => {
    if (!value || value <= 0) return 'Price must be greater than 0';
    if (value > 999999.99) return 'Price must be less than $999,999.99';
    return null;
  },

  description: (value: string | undefined) => {
    if (!value) return null; // Description is optional
    if (value.length < 10) return 'Description must be at least 10 characters';
    if (value.length > 2000) return 'Description must be no more than 2,000 characters';
    return null;
  },

  zipCode: (value: string) => {
    if (!value.trim()) return 'ZIP code is required';
    if (value.length < 5) return 'ZIP code must be at least 5 characters';
    if (value.length > 10) return 'ZIP code must be no more than 10 characters';
    if (!/^[0-9-]+$/.test(value)) return 'ZIP code must contain only numbers and dashes';
    return null;
  },

  images: (files: File[] | undefined) => {
    if (!files || files.length === 0) return 'At least one image is required';
    if (files.length > 10) return 'Maximum 10 images allowed';
    
    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) {
        return 'Each image must be no larger than 5MB';
      }
      if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
        return 'Only JPEG, PNG, WebP, and GIF images are allowed';
      }
    }
    return null;
  },
};