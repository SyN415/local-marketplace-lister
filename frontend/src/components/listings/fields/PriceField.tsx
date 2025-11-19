import React, { useCallback } from 'react';
import { TextField, InputAdornment, Box, Typography } from '@mui/material';
import { AttachMoney } from '@mui/icons-material';
import { useFormContext, Controller } from 'react-hook-form';
import type { TextFieldProps } from '../../../types/forms';

/**
 * PriceField component for listing prices with currency formatting
 * Provides real-time validation and user-friendly price input
 */
const PriceField: React.FC<TextFieldProps> = ({
  name = 'price',
  label = 'Price',
  required = true,
  fullWidth = true,
  margin = 'normal',
  variant = 'outlined',
  helperText,
  error: customError,
  ...props
}) => {
  const {
    control,
    formState: { errors, touchedFields },
  } = useFormContext();

  const error = errors[name]?.message as string;
  const isTouched = touchedFields[name];

  /**
   * Format price as currency
   */
  const formatPrice = useCallback((value: string): string => {
    // Remove all non-digit characters except decimal point
    const cleanValue = value.replace(/[^\d.]/g, '');
    
    // Ensure only one decimal point
    const parts = cleanValue.split('.');
    if (parts.length > 2) {
      return parts[0] + '.' + parts.slice(1).join('');
    }
    
    // Limit to 2 decimal places
    if (parts[1] && parts[1].length > 2) {
      return parts[0] + '.' + parts[1].substring(0, 2);
    }
    
    return cleanValue;
  }, []);

  /**
   * Handle price input changes
   */
  const handlePriceChange = useCallback((field: any, value: string) => {
    const formattedValue = formatPrice(value);
    const numericValue = parseFloat(formattedValue) || 0;
    
    field.onChange(numericValue);
  }, [formatPrice]);

  /**
   * Format display value for input
   */
  const formatDisplayValue = (value: number): string => {
    return value ? value.toString() : '';
  };

  return (
    <Box>
      <Controller
        name={name}
        control={control}
        rules={{
          required: required ? 'Price is required' : false,
          min: {
            value: 0.01,
            message: 'Price must be greater than $0',
          },
          max: {
            value: 999999.99,
            message: 'Price must be less than $999,999.99',
          },
        }}
        render={({ field, fieldState }) => (
          <TextField
            {...field}
            fullWidth={fullWidth}
            label={label}
            required={required}
            margin={margin}
            variant={variant}
            type="text"
            error={!!fieldState.error}
            value={formatDisplayValue(field.value)}
            onChange={(e) => handlePriceChange(field, e.target.value)}
            helperText={
              <Box>
                <Typography variant="caption" color={error && isTouched ? 'error' : 'text.secondary'}>
                  {error && isTouched
                    ? error
                    : helperText || 'Enter the price for your listing'
                  }
                </Typography>
                {field.value > 0 && !error && (
                  <Typography variant="caption" color="success.main" sx={{ mt: 0.5, display: 'block' }}>
                    Price: ${field.value.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </Typography>
                )}
              </Box>
            }
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <AttachMoney color="action" />
                </InputAdornment>
              ),
              inputMode: 'decimal',
              pattern: '[0-9]*',
              ...(props as any).InputProps,
            }}
            {...props}
          />
        )}
      />
      
      {/* Price ranges info */}
      <Box
        sx={{
          mt: 1,
          p: 1,
          bgcolor: 'grey.50',
          borderRadius: 1,
          border: '1px solid',
          borderColor: 'grey.200',
        }}
      >
        <Typography variant="caption" color="text.secondary">
          <strong>Price Guidelines:</strong>
        </Typography>
        <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 0.5 }}>
          • Research similar items to set competitive prices<br />
          • Consider item condition and market demand<br />
          • Factor in shipping costs if applicable
        </Typography>
      </Box>
    </Box>
  );
};

export default PriceField;

/**
 * JSDoc for form integration
 * 
 * @example
 * ```tsx
 * <ListingForm>
 *   <PriceField
 *     name="price"
 *     label="Asking Price"
 *     required={true}
 *     helperText="Set a fair price based on market research"
 *   />
 * </ListingForm>
 * ```
 * 
 * @remarks
 * - Uses React Hook Form Controller for form integration
 * - Automatically formats currency input
 * - Validates price ranges
 * - Shows formatted price preview
 * - Includes pricing guidelines
 * - Fully responsive and accessible
 */