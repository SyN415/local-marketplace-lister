import React from 'react';
import { TextField, MenuItem, Box, Typography } from '@mui/material';
import { useFormContext, Controller } from 'react-hook-form';
import type { SelectFieldProps } from '../../../types/forms';
import { LISTING_CATEGORIES } from '../../../schemas/listing.schema';

/**
 * CategorySelect component for selecting listing categories
 * Provides pre-defined categories with validation
 */
const CategorySelect: React.FC<SelectFieldProps> = ({
  name = 'category',
  label = 'Category',
  required = true,
  fullWidth = true,
  margin = 'normal',
  variant = 'outlined',
  helperText,
  error: customError,
  options = LISTING_CATEGORIES.map(cat => ({ value: cat, label: cat })),
  ...props
}) => {
  const {
    control,
    formState: { errors, touchedFields },
  } = useFormContext();

  const error = errors[name]?.message as string;
  const isTouched = touchedFields[name];

  return (
    <Box>
      <Controller
        name={name}
        control={control}
        rules={{
          required: required ? 'Category is required' : false,
        }}
        render={({ field, fieldState }) => (
          <TextField
            {...field}
            fullWidth={fullWidth}
            label={label}
            required={required}
            margin={margin}
            variant={variant}
            select
            error={Boolean(fieldState.error)}
            helperText={
              <Typography variant="caption" color={error && isTouched ? 'error' : 'text.secondary'}>
                {error && isTouched
                  ? error
                  : helperText || 'Select the most appropriate category for your item'
                }
              </Typography>
            }
            SelectProps={{
              multiple: false,
              ...(props as any).SelectProps,
            }}
            {...props}
          >
            {options.map((option) => (
              <MenuItem
                key={option.value}
                value={option.value}
                disabled={(option as any).disabled}
              >
                {option.label}
              </MenuItem>
            ))}
          </TextField>
        )}
      />
      
      {/* Category guidance */}
      <Box
        sx={{
          mt: 1,
          p: 1,
          bgcolor: 'info.light',
          borderRadius: 1,
          border: '1px solid',
          borderColor: 'info.main',
        }}
      >
        <Typography variant="caption" color="info.contrastText">
          <strong>Tip:</strong> Choose the category that best describes your item. 
          This helps buyers find your listing more easily.
        </Typography>
      </Box>
    </Box>
  );
};

export default CategorySelect;