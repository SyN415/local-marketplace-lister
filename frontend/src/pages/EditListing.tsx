import React, { useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, Alert, Snackbar, CircularProgress } from '@mui/material';
import { CheckCircle, Error } from '@mui/icons-material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Mascot } from '../components/ui/Mascot';
import ListingForm from '../components/listings/ListingForm';
import { listingsAPI } from '../services/api';
import { FormTransformUtils } from '../utils/form';
import type { ListingFormData } from '../schemas/listing.schema';
import type { FormSubmissionData } from '../types/forms';

/**
 * Edit Listing Page
 * Handles editing existing listings with the multi-step form
 */
const EditListing: React.FC = () => {
  const { id } = useParams<{ id: string }>();
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

  // Fetch listing data
  const {
    data: listing,
    isLoading: isLoadingListing,
    error: fetchError,
  } = useQuery({
    queryKey: ['listing', id],
    queryFn: () => listingsAPI.getListing(id!),
    enabled: !!id,
  });

  // Update listing mutation
  const updateListingMutation = useMutation({
    mutationFn: async ({ data, listingId }: { data: ListingFormData; listingId: string }) => {
      return listingsAPI.updateListing(listingId, data);
    },
    onSuccess: (updatedListing) => {
      // Update the cache
      queryClient.setQueryData(['listing', id], updatedListing);
      queryClient.invalidateQueries({ queryKey: ['listings'] });
      
      // Show success notification
      setNotification({
        open: true,
        message: 'Listing updated successfully!',
        severity: 'success',
      });

      // Redirect to listing detail after a delay
      setTimeout(() => {
        navigate(`/listings/${updatedListing.id}`);
      }, 2000);
    },
    onError: (error: any) => {
      console.error('Failed to update listing:', error);
      setNotification({
        open: true,
        message: error.message || 'Failed to update listing. Please try again.',
        severity: 'error',
      });
    },
  });

  // Transform listing data to form format
  const getInitialFormData = useCallback((): Partial<ListingFormData> | undefined => {
    if (!listing) return undefined;

    return {
      title: listing.title,
      description: listing.description || '',
      price: listing.price,
      category: listing.category as any,
      condition: listing.condition.toLowerCase() as any, // Ensure matching case
      images: [], // Images would need separate handling
      location: listing.location ? FormTransformUtils.stringToLocation(listing.location) as any : {
        address: '',
        city: '',
        state: '',
        zipCode: '',
        latitude: undefined,
        longitude: undefined,
      },
    };
  }, [listing]);

  // Handle form submission
  const handleFormSubmit = useCallback(async (data: FormSubmissionData) => {
    if (!id) {
      setNotification({
        open: true,
        message: 'Invalid listing ID',
        severity: 'error',
      });
      return;
    }

    try {
      await updateListingMutation.mutateAsync({
        data: data.data,
        listingId: id,
      });
    } catch (error) {
      console.error('Form submission error:', error);
    }
  }, [id, updateListingMutation]);

  // Handle step changes for analytics
  const handleStepChange = useCallback((step: number) => {
    console.log('Step changed to:', step);
    // Could track analytics here
  }, []);

  // Handle success callback
  const handleSuccess = useCallback((updatedListing: any) => {
    console.log('Listing updated successfully:', updatedListing);
  }, []);

  // Handle error callback
  const handleError = useCallback((error: Error) => {
    console.error('Form error:', error);
  }, []);

  // Close notification
  const handleCloseNotification = useCallback(() => {
    setNotification(prev => ({ ...prev, open: false }));
  }, []);

  // Loading state
  if (isLoadingListing) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '400px',
          gap: 2
        }}
      >
        <Mascot variant="sleepy" size="xl" animated animation="pulse" />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <CircularProgress size={24} />
          <Typography variant="body1">
            Loading listing...
          </Typography>
        </Box>
      </Box>
    );
  }

  // Error state
  if (fetchError || !listing) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          Failed to load listing. Please check the URL and try again.
        </Alert>
        <Typography variant="body2" color="text.secondary">
          {fetchError?.message || 'Listing not found'}
        </Typography>
        <Box sx={{ mt: 2 }}>
          <button onClick={() => navigate('/dashboard')}>
            Return to Dashboard
          </button>
        </Box>
      </Box>
    );
  }

  return (
    <Box>
      <ListingForm
        listingId={id}
        isEdit={true}
        initialData={getInitialFormData()}
        onSubmit={handleFormSubmit}
        onStepChange={handleStepChange}
        onSuccess={handleSuccess}
        onError={handleError}
        config={{
          title: `Edit Listing: ${listing.title}`,
          description: 'Update your listing details below',
          submitButtonText: 'Update Listing',
          savingButtonText: 'Updating...',
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

export default EditListing;

/**
 * JSDoc
 * 
 * @remarks
 * - Uses React Query for data fetching and mutations
 * - Loads existing listing data on mount
 * - Transforms API data to form format
 * - Handles update operations with optimistic updates
 * - Shows loading and error states appropriately
 * 
 * @example
 * ```tsx
 * // Route configuration
 * <Route path="/edit-listing/:id" element={<EditListing />} />
 * 
 * // Navigation from other components
 * navigate(`/edit-listing/${listingId}`);
 * ```
 */