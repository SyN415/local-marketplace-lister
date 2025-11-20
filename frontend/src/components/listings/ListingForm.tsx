import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Stepper,
  Step,
  StepLabel,
  Button,
  Typography,
  Container,
  Alert,
  CircularProgress,
  Divider,
} from '@mui/material';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronLeft, ChevronRight, Save, CheckCircle, AutoAwesome } from '@mui/icons-material';
import type { ListingFormData, FormStep } from '../../schemas/listing.schema';
import { ListingFormSchema } from '../../schemas/listing.schema';
import type { UseFormOptions, FormEvents } from '../../types/forms';
import { DraftStorage, AnalyticsUtils } from '../../utils/form';
import { uploadListingImages } from '../../services/upload';

// Import field components
import TitleField from './fields/TitleField';
import PriceField from './fields/PriceField';
import CategorySelect from './fields/CategorySelect';
import ConditionSelect from './fields/ConditionSelect';
import DescriptionField from './fields/DescriptionField';
import LocationFields from './fields/LocationFields';
import ImageUpload from './fields/ImageUpload';

/**
 * Multi-step listing form component
 * Handles form state, validation, navigation, and submission
 */
const ListingForm: React.FC<UseFormOptions & FormEvents> = ({
  initialData,
  listingId,
  isEdit = false,
  config,
  events,
}) => {
  // Form configuration
  const formConfig = {
    title: isEdit ? 'Edit Listing' : 'Create New Listing',
    description: isEdit ? 'Update your listing details' : 'Fill out the form to create a new listing',
    submitButtonText: isEdit ? 'Update Listing' : 'Create Listing',
    savingButtonText: isEdit ? 'Updating...' : 'Creating...',
    saveDraftButtonText: 'Save Draft',
    cancelButtonText: 'Cancel',
    maxSteps: 4,
    showProgress: true,
    showNavigation: true,
    enableAutoSave: true,
    autoSaveInterval: 30000,
    enableKeyboardNavigation: true,
    ...config,
  };

  // Form state
  const [currentStep, setCurrentStep] = useState<FormStep>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [aiAnalysisResult, setAiAnalysisResult] = useState<any>(null);

  // Steps configuration
  const steps = [
    {
      number: 1 as FormStep,
      title: 'Photos',
      description: 'Upload photos to auto-fill details',
      fields: ['images'],
    },
    {
      number: 2 as FormStep,
      title: 'Details',
      description: 'Verify and edit listing details',
      fields: ['title', 'price', 'category', 'condition', 'description'],
    },
    {
      number: 3 as FormStep,
      title: 'Location',
      description: 'Where is this item located?',
      fields: ['location'],
    },
    {
      number: 4 as FormStep,
      title: 'Review & Submit',
      description: 'Review your listing before publishing',
      fields: [],
    },
  ];

  // React Hook Form setup
  const methods = useForm<ListingFormData>({
    resolver: zodResolver(ListingFormSchema as any),
    defaultValues: {
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
      ...initialData,
    },
    mode: 'onChange',
  });

  const {
    handleSubmit,
    trigger,
    getValues,
    setValue,
    watch,
    reset,
    formState: { errors, isValid },
  } = methods;

  // Watch form data for auto-save
  const watchedData = watch();

  // Auto-save functionality
  useEffect(() => {
    if (formConfig.enableAutoSave && !isSubmitting) {
      const cleanup = DraftStorage.setupAutoSave(
        () => getValues(),
        () => currentStep,
        listingId
      );
      return cleanup;
    }
  }, [currentStep, watchedData, isSubmitting, listingId, getValues, formConfig.enableAutoSave]);

  // Load draft on mount
  useEffect(() => {
    const draft = DraftStorage.loadDraft(listingId);
    if (draft && draft.data && Object.keys(draft.data).length > 0) {
      // Ask user if they want to load the draft
      if (confirm('A saved draft was found. Would you like to continue with it?')) {
        reset(draft.data);
        setCurrentStep(draft.currentStep);
      }
    }
  }, [listingId, reset]);

  // Keyboard navigation
  useEffect(() => {
    if (!formConfig.enableKeyboardNavigation) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case 'Enter':
            event.preventDefault();
            if (currentStep === 4) {
              handleSubmit(handleFormSubmit as any)();
            } else {
              handleNext();
            }
            break;
          case 'ArrowRight':
            event.preventDefault();
            if (currentStep < 4) handleNext();
            break;
          case 'ArrowLeft':
            event.preventDefault();
            if (currentStep > 1) handleBack();
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [currentStep, formConfig.enableKeyboardNavigation]);

  // Step validation
  const validateStep = useCallback(async (step: FormStep): Promise<boolean> => {
    const currentStepConfig = steps.find(s => s.number === step);
    if (!currentStepConfig) return false;

    const fieldsToValidate = currentStepConfig.fields;
    if (fieldsToValidate.length === 0) return true; // Review step

    const isStepValid = await trigger(fieldsToValidate as any);
    
    if (!isStepValid) {
      const stepErrors: Record<string, string> = {};
      
      fieldsToValidate.forEach(field => {
        const fieldError = (errors as any)[field]?.message;
        if (fieldError) {
          stepErrors[field] = fieldError;
        }
      });
      
      setValidationErrors(stepErrors);
    } else {
      setValidationErrors({});
    }

    return isStepValid;
  }, [trigger, getValues, errors, steps]);

  // Navigation handlers
  const handleNext = useCallback(async () => {
    const isValid = await validateStep(currentStep);
    if (isValid && currentStep < 4) {
      AnalyticsUtils.trackStepExit(currentStep);
      setCurrentStep(prev => (prev + 1) as FormStep);
      AnalyticsUtils.trackStepEntry(currentStep + 1 as FormStep);
      events?.onStepChange?.((currentStep + 1) as FormStep);
    }
  }, [currentStep, validateStep, events]);

  const handleBack = useCallback(() => {
    if (currentStep > 1) {
      AnalyticsUtils.trackStepExit(currentStep);
      setCurrentStep(prev => (prev - 1) as FormStep);
      AnalyticsUtils.trackStepEntry(currentStep - 1 as FormStep);
      events?.onStepChange?.((currentStep - 1) as FormStep);
    }
  }, [currentStep, events]);

  const handleStepClick = useCallback(async (step: FormStep) => {
    // Only allow clicking completed steps or the current step
    if (step <= currentStep) {
      const isValid = await validateStep(currentStep);
      if (isValid || step === currentStep) {
        AnalyticsUtils.trackStepExit(currentStep);
        setCurrentStep(step);
        AnalyticsUtils.trackStepEntry(step);
        events?.onStepChange?.(step);
      }
    }
  }, [currentStep, validateStep, events]);

  // Save draft
  const handleSaveDraft = useCallback(async () => {
    setIsSaving(true);
    try {
      const data = getValues();
      DraftStorage.saveDraft(data, currentStep, listingId);
      events?.onSaveDraft?.({
        id: listingId,
        data,
        currentStep,
        timestamp: new Date(),
        isAutoSaved: false,
      });
    } catch (error) {
      console.error('Failed to save draft:', error);
    } finally {
      setIsSaving(false);
    }
  }, [getValues, currentStep, listingId, events]);

  // Form submission
  const handleFormSubmit = useCallback(async (data: ListingFormData) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Upload images
      let uploadedUrls: string[] = [];
      if (data.images && data.images.length > 0) {
        // Filter for File objects (in case mixed with existing URLs in edit mode)
        const filesToUpload = data.images.filter(img => img instanceof File);
        const existingUrls = data.images.filter(img => !(img instanceof File)) as unknown as string[];
        
        if (filesToUpload.length > 0) {
          const newUrls = await uploadListingImages(filesToUpload);
          uploadedUrls = [...existingUrls, ...newUrls];
        } else {
          uploadedUrls = existingUrls;
        }
      }

      // Create submission data with image URLs instead of Files
      const submissionData = {
        data: { ...data, images: uploadedUrls as any }, // Cast to any to bypass File[] type constraint
        isEdit,
        listingId,
        images: uploadedUrls, // Also pass as separate property if needed
      };

      events?.onSubmit?.(submissionData as any);
      
      // Clear draft after successful submission
      if (!isEdit) {
        DraftStorage.clearDraft(listingId);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      setSubmitError(errorMessage);
      events?.onError?.(error as Error);
    } finally {
      setIsSubmitting(false);
    }
  }, [isEdit, listingId, events]);

  // Handle AI Analysis Result
  const handleAiAnalysis = useCallback((result: any) => {
    setAiAnalysisResult(result);
    if (result.title) setValue('title', result.title, { shouldValidate: true, shouldDirty: true });
    if (result.description) setValue('description', result.description, { shouldValidate: true, shouldDirty: true });
    if (result.price) setValue('price', result.price, { shouldValidate: true, shouldDirty: true });
    if (result.category) setValue('category', result.category, { shouldValidate: true, shouldDirty: true });
    if (result.condition) setValue('condition', result.condition, { shouldValidate: true, shouldDirty: true });
  }, [setValue]);

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <Box sx={{ display: 'grid', gap: 3 }}>
            <Alert severity="info" icon={<AutoAwesome />} sx={{ mb: 2 }}>
              Start by uploading photos. Our AI will analyze them to help fill out the details!
            </Alert>
            <ImageUpload
              id="images"
              name="images"
              label="Photos"
              required
              helperText="Add up to 10 photos. The first photo will be your cover image."
              onAnalysisComplete={handleAiAnalysis}
            />
            {aiAnalysisResult && (
              <Paper variant="outlined" sx={{ p: 2, mt: 2, bgcolor: 'background.default' }}>
                <Typography variant="subtitle2" color="primary" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AutoAwesome fontSize="small" /> AI Analysis Summary
                </Typography>
                <Typography variant="body2" gutterBottom>
                  <strong>Suggested Title:</strong> {aiAnalysisResult.title}
                </Typography>
                <Typography variant="body2" gutterBottom>
                   <strong>Price Estimate:</strong> ${aiAnalysisResult.price}
                </Typography>
                <Alert severity="success" sx={{ mt: 1, py: 0 }}>
                  Details have been auto-filled! Click Next to review.
                </Alert>
              </Paper>
            )}
          </Box>
        );

      case 2:
        return (
          <Box sx={{ display: 'grid', gap: 3 }}>
            <TitleField id="title" name="title" label="Title" />
            <PriceField id="price" name="price" label="Price" />
            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: '1fr 1fr' }}>
              <CategorySelect id="category" name="category" label="Category" />
              <ConditionSelect id="condition" name="condition" label="Condition" />
            </Box>
            <DescriptionField id="description" name="description" label="Description" />
          </Box>
        );

      case 3:
        return (
          <Box sx={{ display: 'grid', gap: 2 }}>
            <LocationFields
              errors={validationErrors}
            />
          </Box>
        );

      case 4:
        return (
          <Box sx={{ display: 'grid', gap: 3 }}>
            <Typography variant="h6" gutterBottom>
              Review Your Listing
            </Typography>
            
            <Paper variant="outlined" sx={{ p: 3 }}>
              <Box sx={{ display: 'grid', gap: 2 }}>
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">
                    Title
                  </Typography>
                  <Typography variant="body1">
                    {watchedData.title || 'Not provided'}
                  </Typography>
                </Box>
                
                <Divider />
                
                <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: '1fr 1fr' }}>
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">
                      Price
                    </Typography>
                    <Typography variant="body1">
                      ${watchedData.price?.toLocaleString() || '0'}
                    </Typography>
                  </Box>
                  
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">
                      Category
                    </Typography>
                    <Typography variant="body1">
                      {watchedData.category || 'Not selected'}
                    </Typography>
                  </Box>
                  
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">
                      Condition
                    </Typography>
                    <Typography variant="body1" sx={{ textTransform: 'capitalize' }}>
                      {watchedData.condition ? watchedData.condition.replace('_', ' ') : 'Not selected'}
                    </Typography>
                  </Box>
                </Box>
                
                {watchedData.description && (
                  <>
                    <Divider />
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">
                        Description
                      </Typography>
                      <Typography variant="body1">
                        {watchedData.description}
                      </Typography>
                    </Box>
                  </>
                )}
                
                {watchedData.location?.address && (
                  <>
                    <Divider />
                    <Box>
                      <Typography variant="subtitle2" color="text.secondary">
                        Location
                      </Typography>
                      <Typography variant="body1">
                        {[
                          watchedData.location.address,
                          watchedData.location.city,
                          watchedData.location.state,
                          watchedData.location.zipCode,
                        ].filter(Boolean).join(', ')}
                      </Typography>
                    </Box>
                  </>
                )}
              </Box>
            </Paper>
            
            <Alert severity="success" icon={<CheckCircle />}>
              Your listing is ready to be published. Review all details before submitting.
            </Alert>
          </Box>
        );

      default:
        return null;
    }
  };

  const currentStepConfig = steps.find(s => s.number === currentStep);
  const canGoNext = currentStep < 4;
  const canGoBack = currentStep > 1;

  return (
    <FormProvider {...methods}>
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Paper
          elevation={0}
          sx={{
            p: { xs: 3, md: 5 },
            borderRadius: 0,
            background: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          {/* Header */}
          <Box sx={{ mb: 5, textAlign: 'center' }}>
            <Typography
              variant="h3"
              component="h1"
              gutterBottom
              sx={{
                fontWeight: 800,
                background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                mb: 1
              }}
            >
              {formConfig.title}
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ fontSize: '1.1rem' }}>
              {formConfig.description}
            </Typography>
          </Box>

          {/* Progress Indicator */}
          {formConfig.showProgress && (
            <Box sx={{ mb: 6 }}>
              <Stepper activeStep={currentStep - 1} alternativeLabel>
                {steps.map((step) => (
                  <Step
                    key={step.number}
                    completed={step.number < currentStep}
                    onClick={() => handleStepClick(step.number)}
                    sx={{
                      cursor: step.number <= currentStep ? 'pointer' : 'default',
                      '& .MuiStepLabel-root': {
                        cursor: step.number <= currentStep ? 'pointer' : 'default',
                      },
                      '& .MuiStepIcon-root': {
                        width: 28,
                        height: 28,
                      },
                      '& .MuiStepIcon-root.Mui-active': {
                        color: 'primary.main',
                      },
                      '& .MuiStepIcon-root.Mui-completed': {
                        color: 'success.main',
                      },
                    }}
                  >
                    <StepLabel>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{step.title}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {step.description}
                      </Typography>
                    </StepLabel>
                  </Step>
                ))}
              </Stepper>
            </Box>
          )}

          {/* Error Alert */}
          {submitError && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {submitError}
            </Alert>
          )}

          {/* Form Content */}
          <Box component="form" onSubmit={handleSubmit(handleFormSubmit as any)}>
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" gutterBottom>
                Step {currentStep}: {currentStepConfig?.title}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                {currentStepConfig?.description}
              </Typography>
              
              {renderStepContent()}
            </Box>

            {/* Navigation */}
            {formConfig.showNavigation && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  {canGoBack && (
                    <Button
                      variant="outlined"
                      startIcon={<ChevronLeft />}
                      onClick={handleBack}
                      disabled={isSubmitting || isSaving}
                      sx={{
                        borderRadius: 0,
                        borderWidth: 2,
                        borderColor: 'text.primary',
                        color: 'text.primary',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        '&:hover': {
                          borderWidth: 2,
                          borderColor: 'text.primary',
                          bgcolor: 'text.primary',
                          color: 'background.paper',
                        },
                      }}
                    >
                      Back
                    </Button>
                  )}
                </Box>

                <Box sx={{ display: 'flex', gap: 2 }}>
                  {/* Save Draft Button */}
                  <Button
                    variant="outlined"
                    startIcon={isSaving ? <CircularProgress size={16} /> : <Save />}
                    onClick={handleSaveDraft}
                    disabled={isSubmitting || isSaving}
                    sx={{
                      borderRadius: 0,
                      borderWidth: 2,
                      borderColor: 'text.primary',
                      color: 'text.primary',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      '&:hover': {
                        borderWidth: 2,
                        borderColor: 'text.primary',
                        bgcolor: 'text.primary',
                        color: 'background.paper',
                      },
                    }}
                  >
                    {isSaving ? 'Saving...' : formConfig.saveDraftButtonText}
                  </Button>

                  {/* Next/Submit Button */}
                  {canGoNext ? (
                    <Button
                      variant="contained"
                      endIcon={<ChevronRight />}
                      onClick={handleNext}
                      disabled={isSubmitting || isSaving}
                      disableElevation
                      sx={{
                        px: 4,
                        py: 1,
                        borderRadius: 0,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        bgcolor: 'primary.main',
                        '&:hover': {
                          bgcolor: 'primary.dark',
                        }
                      }}
                    >
                      Next
                    </Button>
                  ) : (
                    <Button
                      type="submit"
                      variant="contained"
                      disabled={!isValid || isSubmitting || isSaving}
                      disableElevation
                      startIcon={
                        isSubmitting ? (
                          <CircularProgress size={16} color="inherit" />
                        ) : (
                          <CheckCircle />
                        )
                      }
                      sx={{
                        px: 4,
                        py: 1,
                        borderRadius: 0,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        bgcolor: 'primary.main',
                        '&:hover': {
                          bgcolor: 'primary.dark',
                        }
                      }}
                    >
                      {isSubmitting ? formConfig.savingButtonText : formConfig.submitButtonText}
                    </Button>
                  )}
                </Box>
              </Box>
            )}

            {/* Keyboard Navigation Hint */}
            {formConfig.enableKeyboardNavigation && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="caption" color="text.secondary">
                  💡 Use Ctrl/Cmd + Arrow keys to navigate, Ctrl/Cmd + Enter to submit
                </Typography>
              </Box>
            )}
          </Box>
        </Paper>
      </Container>
    </FormProvider>
  );
};

export default ListingForm;

/**
 * JSDoc usage example
 * 
 * @example
 * ```tsx
 * // Create new listing
 * <ListingForm
 *   onSubmit={handleSubmit}
 *   onStepChange={handleStepChange}
 *   onSuccess={handleSuccess}
 * />
 * 
 * // Edit existing listing
 * <ListingForm
 *   listingId="123"
 *   isEdit={true}
 *   initialData={listingData}
 *   onSubmit={handleUpdate}
 * />
 * ```
 */