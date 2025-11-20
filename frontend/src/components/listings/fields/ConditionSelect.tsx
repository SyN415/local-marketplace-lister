import React from 'react';
import { TextField, MenuItem, Box, Typography } from '@mui/material';
import { useFormContext, Controller } from 'react-hook-form';
import { LISTING_CONDITIONS } from '../../../schemas/listing.schema';
import type { SelectFieldProps } from '../../../types/forms';

/**
 * ConditionSelect component for selecting item condition
 */
const ConditionSelect: React.FC<SelectFieldProps> = ({
  name = 'condition',
  label = 'Condition',
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

  const options = LISTING_CONDITIONS.map(condition => {
    let label = condition.replace('_', ' ');
    label = label.charAt(0).toUpperCase() + label.slice(1);
    return {
      value: condition,
      label: label
    };
  });

  return (
    <Box>
      <Controller
        name={name}
        control={control}
        rules={{
          required: required ? 'Condition is required' : false,
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
            error={!!fieldState.error}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 0,
                '& fieldset': {
                  borderColor: 'divider',
                },
                '&:hover fieldset': {
                  borderColor: 'text.primary',
                },
                '&.Mui-focused fieldset': {
                  borderWidth: 2,
                },
              },
              '& .MuiInputLabel-root': {
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                fontSize: '0.75rem',
              },
            }}
            helperText={
              <Typography variant="caption" color={error && isTouched ? 'error' : 'text.secondary'}>
                {error && isTouched
                  ? error
                  : helperText || 'Select the condition of your item'
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
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
        )}
      />
    </Box>
  );
};

export default ConditionSelect;