import React from 'react';
import { Box, TextField, Typography } from '@mui/material';
import { useFormContext, Controller } from 'react-hook-form';
import type { LocationFieldProps } from '../../../types/forms';

/**
 * LocationFields component for address input with geocoding support
 */
const LocationFields: React.FC<LocationFieldProps> = ({
  value,
  onChange,
  errors,
  disabled = false,
  fullWidth = true,
}) => {
  const { control } = useFormContext();

  const handleFieldChange = (field: keyof typeof value, fieldValue: string) => {
    const updatedLocation = { ...value, [field]: fieldValue };
    onChange(updatedLocation);

    // If all required fields are filled, trigger geocoding
    if (updatedLocation.address && updatedLocation.city && updatedLocation.state && updatedLocation.zipCode) {
      // In a real app, you would integrate with a geocoding service here
      // For now, we'll just log the location
      console.log('Geocoding location:', updatedLocation);
    }
  };

  const locationFields = [
    { name: 'address', label: 'Street Address', required: true, gridSize: 12 },
    { name: 'city', label: 'City', required: true, gridSize: 6 },
    { name: 'state', label: 'State', required: true, gridSize: 3 },
    { name: 'zipCode', label: 'ZIP Code', required: true, gridSize: 3 },
  ] as const;

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Location
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Provide your location to help buyers find your listing
      </Typography>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 2 }}>
        {locationFields.map((field) => (
          <Box key={field.name} sx={{ gridColumn: `span ${field.gridSize}` }}>
            <Controller
              name={`location.${field.name}`}
              control={control}
              rules={{
                required: field.required ? `${field.label} is required` : false,
                minLength: field.name === 'zipCode' ? {
                  value: 5,
                  message: 'ZIP code must be at least 5 characters'
                } : undefined,
                maxLength: field.name === 'zipCode' ? {
                  value: 10,
                  message: 'ZIP code must be no more than 10 characters'
                } : undefined,
              }}
              render={({ field: controllerField, fieldState }) => (
                <TextField
                  {...controllerField}
                  fullWidth={fullWidth}
                  label={field.label}
                  required={field.required}
                  disabled={disabled}
                  error={!!fieldState.error || !!errors?.[field.name]}
                  helperText={
                    fieldState.error?.message ||
                    errors?.[field.name] ||
                    (field.name === 'zipCode' ? '5-10 characters' : '')
                  }
                  value={value[field.name] || ''}
                  onChange={(e) => handleFieldChange(field.name, e.target.value)}
                />
              )}
            />
          </Box>
        ))}
      </Box>

      {/* Coordinates display */}
      {value.latitude && value.longitude && (
        <Box sx={{ mt: 2, p: 2, bgcolor: 'success.light', borderRadius: 1 }}>
          <Typography variant="caption" color="success.dark">
            ✓ Location coordinates: {value.latitude.toFixed(6)}, {value.longitude.toFixed(6)}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default LocationFields;