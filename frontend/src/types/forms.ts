import type { ListingFormData, LocationData, FormStep } from '../schemas/listing.schema';
import type { Listing } from './index';

/**
 * Form state management interfaces
 */
export interface FormState {
  currentStep: FormStep;
  isDirty: boolean;
  isValid: boolean;
  isSubmitting: boolean;
  submitCount: number;
  touchedFields: string[];
  isDraftSaved: boolean;
  lastSavedAt?: Date;
}

/**
 * Multi-step form step configuration
 */
export interface StepConfig {
  number: FormStep;
  title: string;
  description: string;
  isCompleted: boolean;
  isActive: boolean;
  isOptional?: boolean;
  validationFields: (keyof ListingFormData)[];
}

/**
 * Form field component props interfaces
 */
export interface BaseFieldProps {
  name: string;
  id?: string;
  label: string;
  required?: boolean;
  disabled?: boolean;
  helperText?: string;
  error?: string;
  fullWidth?: boolean;
  margin?: 'none' | 'dense' | 'normal';
  variant?: 'outlined' | 'filled' | 'standard';
  className?: string;
}

/**
 * Text field specific props
 */
export interface TextFieldProps extends BaseFieldProps {
  type?: 'text' | 'email' | 'password' | 'number';
  placeholder?: string;
  multiline?: boolean;
  rows?: number;
  maxLength?: number;
  showCharacterCount?: boolean;
  startAdornment?: React.ReactNode;
  endAdornment?: React.ReactNode;
}

/**
 * Select field props
 */
export interface SelectFieldProps extends BaseFieldProps {
  options?: Array<{
    value: string;
    label: string;
    disabled?: boolean;
  }>;
  multiple?: boolean;
  placeholder?: string;
}

/**
 * Image upload field props
 */
export interface ImageUploadFieldProps extends BaseFieldProps {
  maxFiles?: number;
  maxFileSize?: number; // in bytes
  acceptedTypes?: string[];
  allowReorder?: boolean;
  showPreview?: boolean;
  onImagesChange?: (files: File[]) => void;
  onImageRemove?: (index: number) => void;
  onImageReorder?: (fromIndex: number, toIndex: number) => void;
}

/**
 * Location field props
 */
export interface LocationFieldProps {
  value: Partial<LocationData>;
  onChange: (location: Partial<LocationData>) => void;
  onCoordinatesChange?: (coords: { lat: number; lng: number } | null) => void;
  errors?: Partial<Record<keyof LocationData, string>>;
  disabled?: boolean;
  fullWidth?: boolean;
}

/**
 * Form navigation props
 */
export interface FormNavigationProps {
  currentStep: FormStep;
  totalSteps: number;
  canGoBack: boolean;
  canGoNext: boolean;
  isSubmitting: boolean;
  isValid: boolean;
  onNext: () => void;
  onBack: () => void;
  onSubmit: () => void;
  onStepClick?: (step: FormStep) => void;
}

/**
 * Form progress indicator props
 */
export interface FormProgressProps {
  steps: StepConfig[];
  currentStep: FormStep;
  onStepClick?: (step: FormStep) => void;
  showStepNumbers?: boolean;
  showStepDescriptions?: boolean;
}

/**
 * Form draft management
 */
export interface DraftData {
  id?: string;
  data: Partial<ListingFormData>;
  currentStep: FormStep;
  timestamp: Date;
  isAutoSaved: boolean;
}

/**
 * Form submission data
 */
export interface FormSubmissionData {
  data: ListingFormData;
  isEdit?: boolean;
  listingId?: string;
  images?: File[];
  removeImageIds?: string[];
}

/**
 * Form validation result
 */
export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
  fieldErrors: Record<string, string>;
  stepErrors: Record<FormStep, Record<string, string>>;
}

/**
 * Form API integration
 */
export interface FormApiConfig {
  createEndpoint?: string;
  updateEndpoint?: string;
  getEndpoint?: string;
  uploadEndpoint?: string;
  useQuery?: boolean;
  useMutation?: boolean;
}

/**
 * Form component configuration
 */
export interface FormConfig {
  title: string;
  description?: string;
  submitButtonText: string;
  savingButtonText?: string;
  saveDraftButtonText?: string;
  cancelButtonText?: string;
  maxSteps?: number;
  showProgress?: boolean;
  showNavigation?: boolean;
  enableAutoSave?: boolean;
  autoSaveInterval?: number; // in milliseconds
  enableKeyboardNavigation?: boolean;
}

/**
 * Form theme and styling
 */
export interface FormThemeConfig {
  spacing: number;
  maxWidth?: string;
  backgroundColor?: string;
  borderRadius?: number;
  shadow?: string;
  primaryColor?: string;
  secondaryColor?: string;
  errorColor?: string;
  successColor?: string;
  warningColor?: string;
}

/**
 * Form events and callbacks
 */
export interface FormEvents {
  onSubmit?: (data: FormSubmissionData) => void;
  onSaveDraft?: (data: DraftData) => void;
  onLoadDraft?: (draft: DraftData) => void;
  onStepChange?: (step: FormStep) => void;
  onValidationError?: (errors: ValidationResult) => void;
  onAutoSave?: (data: Partial<ListingFormData>) => void;
  onCancel?: () => void;
  onSuccess?: (listing: Listing) => void;
  onError?: (error: Error) => void;
}

/**
 * Form hooks return types
 */
export interface UseFormOptions {
  initialData?: Partial<ListingFormData>;
  listingId?: string;
  isEdit?: boolean;
  config?: Partial<FormConfig>;
  events?: Partial<FormEvents>;
}

export interface UseFormReturn {
  formData: Partial<ListingFormData>;
  formState: FormState;
  steps: StepConfig[];
  currentStep: FormStep;
  validationResult: ValidationResult;
  draftData?: DraftData;
  isLoading: boolean;
  isError: boolean;
  error?: Error;
  // Form methods
  setValue: (field: keyof ListingFormData, value: any) => void;
  getValues: () => Partial<ListingFormData>;
  setCurrentStep: (step: FormStep) => void;
  nextStep: () => void;
  previousStep: () => void;
  goToStep: (step: FormStep) => void;
  validateStep: (step?: FormStep) => ValidationResult;
  validateForm: () => ValidationResult;
  saveDraft: () => void;
  loadDraft: (draftId?: string) => void;
  clearDraft: () => void;
  submitForm: () => void;
  resetForm: () => void;
  setErrors: (errors: Record<string, string>) => void;
  clearErrors: (fieldNames?: string[]) => void;
}

/**
 * Form context types
 */
export interface FormContextValue extends UseFormReturn {
  config: FormConfig;
  theme: FormThemeConfig;
  registerField: (name: string, component: React.ComponentType<any>) => void;
  unregisterField: (name: string) => void;
  getFieldComponent: (name: string) => React.ComponentType<any> | undefined;
}

/**
 * Form field registration
 */
export interface FieldRegistration {
  name: string;
  component: React.ComponentType<any>;
  isRequired?: boolean;
  validationRules?: any[];
  defaultValue?: any;
}

/**
 * Image processing utilities
 */
export interface ImageProcessingOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
  compression?: number;
}

export interface ProcessedImage {
  file: File;
  preview: string;
  size: number;
  width: number;
  height: number;
  isValid: boolean;
  errors?: string[];
}

/**
 * Form analytics and tracking
 */
export interface FormAnalytics {
  timeSpent: Record<FormStep, number>;
  stepInteractions: Record<FormStep, number>;
  fieldInteractions: Record<string, number>;
  validationAttempts: Record<FormStep, number>;
  submissionAttempts: number;
  completionRate: number;
  dropOffPoints: FormStep[];
}

/**
 * Accessibility and ARIA support
 */
export interface AriaLabels {
  formTitle?: string;
  stepIndicator?: string;
  navigation?: string;
  progressBar?: string;
  submitButton?: string;
  cancelButton?: string;
  saveDraftButton?: string;
  errorSummary?: string;
  fieldLabels?: Record<string, string>;
}
/**
 * Craigslist connection form data
 */
export interface CraigslistConnectionForm {
  contactEmail: string;
  contactPhone?: string;
  showPhoneOnListings: boolean;
  enabled: boolean;
}