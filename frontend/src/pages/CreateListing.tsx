import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Alert, Snackbar } from '@mui/material';
import { CheckCircle, Error } from '@mui/icons-material';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import ListingForm from '../components/listings/ListingForm';
import { listingsAPI } from '../services/api';
import type { ListingFormData } from '../schemas/listing.schema';
import type { FormSubmissionData } from '../types/forms';

/**
 * Create Listing Page
 * Handles the creation of new listings with the multi-step form
 */
const CreateListing: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [notification, setNotification] = React.useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({
    open: false,
    message: '',
    severity: 'success',
  });

  // Create listing mutation
  const createListingMutation = useMutation({
    mutationFn: async (formData: ListingFormData) => {
      return listingsAPI.createListing(formData);
    },
    onSuccess: (listing) => {
      // Invalidate and refetch listings
      queryClient.invalidateQueries({ queryKey: ['listings'] });
      
      // Show success notification
      setNotification({
        open: true,
        message: 'Listing created successfully!',
        severity: 'success',
      });

      // Redirect to listing detail or dashboard after a delay
      setTimeout(() => {
        navigate(`/listings/${listing.id}`);
      }, 2000);
    },
    onError: (error: any) => {
      console.error('Failed to create listing:', error);
      setNotification({
        open: true,
        message: error.message || 'Failed to create listing. Please try again.',
        severity: 'error',
      });
    },
  });

  // Handle form submission
  const handleFormSubmit = useCallback(async (data: FormSubmissionData) => {
    try {
      await createListingMutation.mutateAsync(data.data);
    } catch (error) {
      // Error is handled by the mutation's onError callback
      console.error('Form submission error:', error);
    }
  }, [createListingMutation]);

  // Handle step changes for analytics
  const handleStepChange = useCallback((step: number) => {
    console.log('Step changed to:', step);
    // Could track analytics here
  }, []);

  // Handle success callback
  const handleSuccess = useCallback((listing: any) => {
    console.log('Listing created successfully:', listing);
  }, []);

  // Handle error callback
  const handleError = useCallback((error: Error) => {
    console.error('Form error:', error);
  }, []);

  // Close notification
  const handleCloseNotification = useCallback(() => {
    setNotification(prev => ({ ...prev, open: false }));
  }, []);

  return (
    <Box>
      <ListingForm
        isEdit={false}
        onSubmit={handleFormSubmit}
        onStepChange={handleStepChange}
        onSuccess={handleSuccess}
        onError={handleError}
        config={{
          title: 'Create New Listing',
          description: 'Fill out the form to create a new listing',
          submitButtonText: 'Create Listing',
          savingButtonText: 'Creating...',
          enableAutoSave: true,
          enableKeyboardNavigation: true,
        }}
        events={{
          onSubmit: handleFormSubmit,
          onStepChange: handleStepChange,
          onSuccess: handleSuccess,
          onError: handleError,
        }}
      />

      {/* Success/Error Notification */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={handleCloseNotification}
          severity={notification.severity}
          variant="filled"
          sx={{ width: '100%' }}
          icon={notification.severity === 'success' ? <CheckCircle /> : <Error />}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default CreateListing;

/**
 * JSDoc
 * 
 * @remarks
 * - Uses React Query for API mutations
 * - Integrates with the multi-step ListingForm component
 * - Handles form submission and success/error states
 * - Provides navigation after successful creation
 * - Shows user-friendly notifications
 * 
 * @example
 * ```tsx
 * // Route configuration
 * <Route path="/create-listing" element={<CreateListing />} />
 * 
 * // Navigation from other components
 * navigate('/create-listing');
 * ```
 */