import React, { useState, useEffect, useCallback } from 'react';
import { FormProvider, useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronLeft, ChevronRight, Save, CheckCircle, Wand2, Share2, AlertCircle } from 'lucide-react';
import type { ListingFormData, FormStep } from '../../schemas/listing.schema';
import { ListingFormSchema, TARGET_PLATFORMS } from '../../schemas/listing.schema';
import type { UseFormOptions, FormEvents } from '../../types/forms';
import { DraftStorage, AnalyticsUtils } from '../../utils/form';
import { uploadListingImages } from '../../services/upload';

// Import UI components
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../ui/card';
import { Separator } from '../ui/separator';
import { Progress } from '../ui/progress';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { cn } from '../../lib/utils';

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
  const [isNavigating, setIsNavigating] = useState(false); // Prevent double-click race conditions
  const [isSaving, setIsSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [aiAnalysisResult, setAiAnalysisResult] = useState<any>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingSubmission, setPendingSubmission] = useState<ListingFormData | null>(null);

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
      title: 'Finalize',
      description: 'Select platforms and publish',
      fields: ['platforms'],
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
      platforms: ['facebook'],
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
    control,
    formState: { errors, isValid },
  } = methods;

  // Watch form data for auto-save
  const watchedData = watch();
  const selectedPlatforms = watchedData.platforms || [];
  const estimatedCost = selectedPlatforms.length; // 1 credit per platform

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
    if (isNavigating) return;
    
    setIsNavigating(true);
    try {
      const isValid = await validateStep(currentStep);
      
      if (isValid && currentStep < 4) {
        AnalyticsUtils.trackStepExit(currentStep);
        setCurrentStep(prev => (prev + 1) as FormStep);
        AnalyticsUtils.trackStepEntry(currentStep + 1 as FormStep);
        events?.onStepChange?.((currentStep + 1) as FormStep);
      }
    } finally {
      // Small delay to prevent double-clicks registering on the next step's button
      setTimeout(() => setIsNavigating(false), 500);
    }
  }, [currentStep, validateStep, events, isNavigating]);

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

  // Execute actual submission after confirmation
  const executeSubmission = useCallback(async () => {
    if (!pendingSubmission) return;
    
    setConfirmOpen(false);
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const data = pendingSubmission;
      
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
      setPendingSubmission(null);
    }
  }, [pendingSubmission, isEdit, listingId, events]);

  // Form submission handler - triggers modal
  const handleFormSubmit = useCallback(async (data: ListingFormData) => {
    // Prevent double-submission or race conditions
    if (isNavigating || isSubmitting) return;

    // Prevent premature submission on Enter key during creation (Step 1-3)
    if (!isEdit && currentStep < 4) {
      await handleNext();
      return;
    }

    // Validate platforms selection manually just in case
    if (!data.platforms || data.platforms.length === 0) {
      setValidationErrors({ platforms: 'Please select at least one platform' });
      return;
    }

    setPendingSubmission(data);
    setConfirmOpen(true);
  }, [isEdit, currentStep, handleNext]);

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
          <div className="space-y-6">
            <Alert variant="default" className="bg-blue-50 border-blue-200 text-blue-800">
              <Wand2 className="h-4 w-4" />
              <AlertTitle>AI-Powered</AlertTitle>
              <AlertDescription>
                Start by uploading photos. Our AI will analyze them to help fill out the details!
              </AlertDescription>
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
              <Card className="bg-muted/50 border-dashed">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base text-primary">
                    <Wand2 className="h-4 w-4" /> AI Analysis Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p><strong>Suggested Title:</strong> {aiAnalysisResult.title}</p>
                  <p><strong>Price Estimate:</strong> ${aiAnalysisResult.price}</p>
                  <Alert className="bg-green-50 border-green-200 text-green-800 py-2">
                     <AlertDescription>
                       Details have been auto-filled! Click Next to review.
                     </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            )}
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <TitleField id="title" name="title" label="Title" />
            <PriceField id="price" name="price" label="Price" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <CategorySelect id="category" name="category" label="Category" />
              <ConditionSelect id="condition" name="condition" label="Condition" />
            </div>
            <DescriptionField id="description" name="description" label="Description" />
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <LocationFields
              errors={validationErrors as any}
            />
          </div>
        );

      case 4:
        return (
          <div className="space-y-8">
            {/* Platform Selection Section */}
            <div>
              <div className="mb-4">
                <h3 className="text-lg font-medium flex items-center gap-2">
                  <Share2 className="h-5 w-5 text-primary" /> Select Platforms
                </h3>
                <p className="text-sm text-muted-foreground">
                  Choose where you want your listing to appear.
                </p>
              </div>
              
              <Card>
                <CardContent className="p-6">
                  <Controller
                    name="platforms"
                    control={control}
                    render={({ field }) => (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {TARGET_PLATFORMS.map((platform) => (
                          <div key={platform} className="flex items-center space-x-2 border p-3 rounded-md hover:bg-muted/50 transition-colors">
                            <Checkbox
                              id={`platform-${platform}`}
                              checked={field.value?.includes(platform)}
                              onCheckedChange={(checked) => {
                                const current = field.value || [];
                                const newValue = checked
                                  ? [...current, platform]
                                  : current.filter((p: string) => p !== platform);
                                field.onChange(newValue);
                              }}
                            />
                            <Label 
                              htmlFor={`platform-${platform}`}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 capitalize cursor-pointer flex-1"
                            >
                              {platform}
                            </Label>
                          </div>
                        ))}
                      </div>
                    )}
                  />
                  {errors.platforms && (
                    <p className="text-sm font-medium text-destructive mt-2">
                      {errors.platforms.message}
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Cost Estimate */}
              <Card className="mt-6 bg-primary/5 border-primary/20">
                <CardContent className="flex justify-between items-center py-4">
                  <div>
                    <h4 className="font-bold text-primary">Estimated Cost</h4>
                    <p className="text-xs text-primary/80">Based on selected platforms</p>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-bold text-primary">{estimatedCost}</span>
                    <span className="text-sm text-primary/80 ml-1">Credits</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Separator />

            {/* Review Section */}
            <div>
              <h3 className="text-lg font-medium mb-4">Review Summary</h3>
              
              <Card>
                <CardContent className="p-6 space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Title & Price</h4>
                    <p className="font-medium">
                      {watchedData.title} • ${watchedData.price?.toLocaleString()}
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">Location</h4>
                    <p>
                      {[watchedData.location?.city, watchedData.location?.state].filter(Boolean).join(', ')} ({watchedData.location?.zipCode})
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const currentStepConfig = steps.find(s => s.number === currentStep);
  const canGoNext = currentStep < 4;
  const canGoBack = currentStep > 1;

  // Calculate progress percentage
  const progress = (currentStep / steps.length) * 100;

  return (
    <>
      <FormProvider {...methods}>
        <div className="max-w-4xl mx-auto py-8 px-4">
          <Card className="bg-glass-bg backdrop-blur-md border-glass-border shadow-lg">
            {/* Header */}
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-3xl font-extrabold bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent mb-2">
                {formConfig.title}
              </CardTitle>
              <CardDescription className="text-lg">
                {formConfig.description}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Progress Indicator */}
              {formConfig.showProgress && (
                <div className="mb-8 space-y-2">
                  <Progress value={progress} className="h-2" />
                  <div className="flex justify-between text-xs text-muted-foreground px-1">
                    {steps.map((step) => (
                      <div 
                        key={step.number}
                        className={cn(
                          "flex flex-col items-center cursor-pointer transition-colors",
                          step.number <= currentStep ? "text-primary font-medium" : "text-muted-foreground"
                        )}
                        onClick={() => handleStepClick(step.number)}
                      >
                        <span>Step {step.number}</span>
                        <span className="hidden sm:inline">{step.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Error Alert */}
              {submitError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{submitError}</AlertDescription>
                </Alert>
              )}

              {/* Form Content */}
              <form onSubmit={handleSubmit(handleFormSubmit as any)}>
                <div className="mb-8">
                  <div className="mb-6">
                    <h2 className="text-xl font-semibold text-foreground">
                      Step {currentStep}: {currentStepConfig?.title}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {currentStepConfig?.description}
                    </p>
                  </div>
                  
                  {renderStepContent()}
                </div>

                {/* Navigation */}
                {formConfig.showNavigation && (
                  <div className="flex justify-between items-center pt-6 border-t">
                    <div>
                      {canGoBack && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleBack}
                          disabled={isSubmitting || isSaving}
                          className="font-bold uppercase tracking-wider"
                        >
                          <ChevronLeft className="mr-2 h-4 w-4" /> Back
                        </Button>
                      )}
                    </div>

                    <div className="flex gap-3">
                      {/* Save Draft Button */}
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={handleSaveDraft}
                        disabled={isSubmitting || isSaving}
                        className="font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground"
                      >
                        {isSaving ? (
                          <>Saving...</>
                        ) : (
                          <>
                            <Save className="mr-2 h-4 w-4" />
                            {formConfig.saveDraftButtonText}
                          </>
                        )}
                      </Button>

                      {/* Next/Submit Button */}
                      {canGoNext ? (
                        <Button
                          type="button"
                          onClick={handleNext}
                          disabled={isSubmitting || isSaving || isNavigating}
                          className="font-bold uppercase tracking-wider min-w-[120px]"
                        >
                          Next <ChevronRight className="ml-2 h-4 w-4" />
                        </Button>
                      ) : (
                        <Button
                          type="submit"
                          disabled={!isValid || isSubmitting || isSaving || isNavigating}
                          className="font-bold uppercase tracking-wider min-w-[140px]"
                        >
                          {isSubmitting ? (
                            <>
                              {formConfig.savingButtonText}
                            </>
                          ) : (
                            <>
                              <CheckCircle className="mr-2 h-4 w-4" />
                              {formConfig.submitButtonText}
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {/* Keyboard Navigation Hint */}
                {formConfig.enableKeyboardNavigation && (
                  <div className="mt-4 text-center">
                    <p className="text-xs text-muted-foreground">
                      💡 Use Ctrl/Cmd + Arrow keys to navigate, Ctrl/Cmd + Enter to submit
                    </p>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>
        </div>
      </FormProvider>

      {/* Confirmation Dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ready to Post?</DialogTitle>
            <DialogDescription>
              You are about to create this listing on <strong>{selectedPlatforms.length} platform(s)</strong>.
              <br /><br />
              This action will deduct <strong>{estimatedCost} credits</strong> from your account.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button onClick={executeSubmission}>
              Confirm & Post
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ListingForm;