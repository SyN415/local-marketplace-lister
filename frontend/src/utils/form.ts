import type { ListingFormData, LocationData, FormStep } from '../schemas/listing.schema';
import type { DraftData, ValidationResult } from '../types/forms';

/**
 * Form data transformation utilities
 */
export class FormTransformUtils {
  /**
   * Transform form data to API format
   */
  static toApiFormat(data: ListingFormData): FormData {
    const formData = new FormData();
    
    // Add text fields
    Object.entries(data).forEach(([key, value]) => {
      if (key !== 'images' && value !== undefined) {
        if (key === 'location' && typeof value === 'object') {
          const location = value as LocationData;
          formData.append('address', location.address || '');
          formData.append('city', location.city || '');
          formData.append('state', location.state || '');
          formData.append('zipCode', location.zipCode || '');
          if (location.latitude) formData.append('latitude', location.latitude.toString());
          if (location.longitude) formData.append('longitude', location.longitude.toString());
        } else {
          formData.append(key, String(value));
        }
      }
    });

    // Add images
    if (data.images) {
      data.images.forEach((file) => {
        formData.append('images', file);
      });
    }

    return formData;
  }

  /**
   * Transform API response to form data
   */
  static fromApiFormat(apiData: any): Partial<ListingFormData> {
    return {
      title: apiData.title,
      description: apiData.description,
      price: apiData.price,
      category: apiData.category,
      condition: apiData.condition,
      images: [], // Images would be handled separately
      location: {
        address: apiData.address || '',
        city: apiData.city || '',
        state: apiData.state || '',
        zipCode: apiData.zipCode || '',
        latitude: apiData.latitude,
        longitude: apiData.longitude,
      },
    };
  }

  /**
   * Transform location data to string format for display
   */
  static locationToString(location: Partial<LocationData>): string {
    const parts = [
      location.address,
      location.city,
      location.state,
      location.zipCode,
    ].filter(Boolean);
    
    return parts.join(', ');
  }

  /**
   * Parse location string back to location object
   */
  static stringToLocation(locationString: string): Partial<LocationData> {
    const parts = locationString.split(',').map(part => part.trim());
    
    return {
      address: parts[0] || '',
      city: parts[1] || '',
      state: parts[2] || '',
      zipCode: parts[3] || '',
    };
  }
}

/**
 * Draft saving and loading utilities
 */
export class DraftStorage {
  private static readonly DRAFT_KEY_PREFIX = 'listing_form_draft_';
  private static readonly AUTO_SAVE_INTERVAL = 30000; // 30 seconds

  /**
   * Save draft to localStorage
   */
  static saveDraft(data: Partial<ListingFormData>, currentStep: number, listingId?: string): void {
    try {
      const draftId = listingId || 'new';
      const draft: DraftData = {
        id: draftId,
        data,
        currentStep: currentStep as any,
        timestamp: new Date(),
        isAutoSaved: true,
      };

      localStorage.setItem(this.DRAFT_KEY_PREFIX + draftId, JSON.stringify(draft));
      console.log('Draft saved:', draftId);
    } catch (error) {
      console.error('Failed to save draft:', error);
    }
  }

  /**
   * Load draft from localStorage
   */
  static loadDraft(listingId?: string): DraftData | null {
    try {
      const draftId = listingId || 'new';
      const stored = localStorage.getItem(this.DRAFT_KEY_PREFIX + draftId);
      
      if (!stored) return null;

      const draft: DraftData = JSON.parse(stored);
      draft.timestamp = new Date(draft.timestamp);
      
      console.log('Draft loaded:', draftId);
      return draft;
    } catch (error) {
      console.error('Failed to load draft:', error);
      return null;
    }
  }

  /**
   * Clear draft from localStorage
   */
  static clearDraft(listingId?: string): void {
    try {
      const draftId = listingId || 'new';
      localStorage.removeItem(this.DRAFT_KEY_PREFIX + draftId);
      console.log('Draft cleared:', draftId);
    } catch (error) {
      console.error('Failed to clear draft:', error);
    }
  }

  /**
   * Get all available drafts
   */
  static getAllDrafts(): DraftData[] {
    try {
      const drafts: DraftData[] = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(this.DRAFT_KEY_PREFIX)) {
          try {
            const stored = localStorage.getItem(key);
            if (stored) {
              const draft: DraftData = JSON.parse(stored);
              draft.timestamp = new Date(draft.timestamp);
              drafts.push(draft);
            }
          } catch (error) {
            console.error('Failed to parse draft:', key, error);
          }
        }
      }
      
      return drafts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    } catch (error) {
      console.error('Failed to get all drafts:', error);
      return [];
    }
  }

  /**
   * Auto-save functionality with debouncing
   */
  static setupAutoSave(
    getFormData: () => Partial<ListingFormData>,
    getCurrentStep: () => number,
    listingId?: string
  ): () => void {
    let timeoutId: number;

    const autoSave = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        const data = getFormData();
        const currentStep = getCurrentStep();
        
        // Only auto-save if there's meaningful data
        if (data.title || data.price || data.description) {
          this.saveDraft(data, currentStep, listingId);
        }
      }, this.AUTO_SAVE_INTERVAL);
    };

    // Save immediately and then on changes
    autoSave();

    // Return cleanup function
    return () => {
      clearTimeout(timeoutId);
    };
  }
}

/**
 * Form validation helpers
 */
export class ValidationUtils {
  /**
   * Validate individual field
   */
  static validateField(name: string, value: any, rules?: any): string | null {
    if (!rules) return null;

    if (rules.required && (!value || (typeof value === 'string' && !value.trim()))) {
      return `${name} is required`;
    }

    if (rules.minLength && value && value.length < rules.minLength.value) {
      return rules.minLength.message || `${name} is too short`;
    }

    if (rules.maxLength && value && value.length > rules.maxLength.value) {
      return rules.maxLength.message || `${name} is too long`;
    }

    if (rules.min && value && value < rules.min.value) {
      return rules.min.message || `${name} is too small`;
    }

    if (rules.max && value && value > rules.max.value) {
      return rules.max.message || `${name} is too large`;
    }

    if (rules.pattern && value && !rules.pattern.test(value)) {
      return rules.message || `${name} format is invalid`;
    }

    return null;
  }

  /**
   * Validate form step
   */
  static validateStep(
    data: Partial<ListingFormData>,
    step: number,
    schema: any
  ): ValidationResult {
    try {
      // Use Zod schema validation for the step
      const stepValidation = schema.safeParse(data);
      
      const errors: Record<string, string> = {};
      const fieldErrors: Record<string, string> = {};

      if (!stepValidation.success) {
        stepValidation.error.issues.forEach((issue: any) => {
          const fieldName = issue.path.join('.');
          errors[fieldName] = issue.message;
          fieldErrors[fieldName] = issue.message;
        });
      }

      return {
        isValid: stepValidation.success,
        errors,
        fieldErrors,
        stepErrors: {
          [step as FormStep]: errors,
        } as Record<FormStep, Record<string, string>>,
      };
    } catch (error) {
      console.error('Validation error:', error);
      return {
        isValid: false,
        errors: { general: 'Validation failed' },
        fieldErrors: {},
        stepErrors: { [step as FormStep]: { general: 'Validation failed' } } as unknown as Record<FormStep, Record<string, string>>,
      };
    }
  }

  /**
   * Check if form is dirty
   */
  static isFormDirty(
    currentData: Partial<ListingFormData>,
    initialData: Partial<ListingFormData>
  ): boolean {
    return JSON.stringify(currentData) !== JSON.stringify(initialData);
  }

  /**
   * Get field display value for form
   */
  static getFieldDisplayValue(value: any): string {
    if (value === null || value === undefined) return '';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }
}

/**
 * Image processing utilities
 */
export class ImageProcessingUtils {
  private static readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  private static readonly ACCEPTED_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
  ];

  /**
   * Validate image file
   */
  static validateImageFile(file: File): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (file.size > this.MAX_FILE_SIZE) {
      errors.push('File size must be less than 5MB');
    }

    if (!this.ACCEPTED_TYPES.includes(file.type)) {
      errors.push('File type must be JPEG, PNG, WebP, or GIF');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Resize image to specified dimensions
   */
  static async resizeImage(
    file: File,
    maxWidth: number = 800,
    maxHeight: number = 600,
    quality: number = 0.8
  ): Promise<File> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Calculate new dimensions
        let { width, height } = img;
        
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        // Draw and compress
        ctx?.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const resizedFile = new File([blob], file.name, {
                type: file.type,
                lastModified: Date.now(),
              });
              resolve(resizedFile);
            } else {
              reject(new Error('Failed to resize image'));
            }
          },
          file.type,
          quality
        );
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Generate image preview URL
   */
  static generatePreviewUrl(file: File): string {
    return URL.createObjectURL(file);
  }

  /**
   * Clean up preview URL
   */
  static cleanupPreviewUrl(url: string): void {
    URL.revokeObjectURL(url);
  }

  /**
   * Process multiple images
   */
  static async processImages(
    files: File[],
    options: {
      resize?: boolean;
      maxWidth?: number;
      maxHeight?: number;
      quality?: number;
    } = {}
  ): Promise<{ file: File; preview: string; errors: string[] }[]> {
    const results = await Promise.all(
      files.map(async (file) => {
        const validation = this.validateImageFile(file);
        let processedFile = file;

        if (validation.isValid && options.resize) {
          try {
            processedFile = await this.resizeImage(
              file,
              options.maxWidth,
              options.maxHeight,
              options.quality
            );
          } catch (error) {
            validation.errors.push('Failed to resize image');
          }
        }

        return {
          file: processedFile,
          preview: this.generatePreviewUrl(processedFile),
          errors: validation.errors,
        };
      })
    );

    return results;
  }
}

/**
 * Keyboard navigation helpers
 */
export class KeyboardUtils {
  /**
   * Handle form navigation with keyboard
   */
  static handleKeyDown(
    event: KeyboardEvent,
    callbacks: {
      onNext?: () => void;
      onBack?: () => void;
      onSubmit?: () => void;
    }
  ): void {
    if (event.ctrlKey || event.metaKey) {
      switch (event.key) {
        case 'Enter':
          event.preventDefault();
          callbacks.onSubmit?.();
          break;
        case 'ArrowRight':
          event.preventDefault();
          callbacks.onNext?.();
          break;
        case 'ArrowLeft':
          event.preventDefault();
          callbacks.onBack?.();
          break;
      }
    }
  }

  /**
   * Check if key combination is for form navigation
   */
  static isFormNavigationKey(event: KeyboardEvent): boolean {
    return (event.ctrlKey || event.metaKey) && 
           ['Enter', 'ArrowLeft', 'ArrowRight'].includes(event.key);
  }
}

/**
 * Form analytics utilities
 */
export class AnalyticsUtils {
  private static startTime: number = Date.now();
  private static stepTimes: Record<number, number> = {};

  /**
   * Track step entry
   */
  static trackStepEntry(step: number): void {
    this.stepTimes[step] = Date.now();
  }

  /**
   * Track step completion
   */
  static trackStepExit(step: number): void {
    const entryTime = this.stepTimes[step];
    if (entryTime) {
      const duration = Date.now() - entryTime;
      console.log(`Step ${step} completion time: ${duration}ms`);
    }
  }

  /**
   * Get form completion metrics
   */
  static getCompletionMetrics() {
    return {
      totalTime: Date.now() - this.startTime,
      stepTimes: this.stepTimes,
    };
  }
}