import React from 'react';
import { TextField, Box, Typography } from '@mui/material';
import { useFormContext, Controller } from 'react-hook-form';
import type { TextFieldProps } from '../../../types/forms';

/**
 * DescriptionField component for listing descriptions with rich text support
 */
const DescriptionField: React.FC<TextFieldProps> = ({
  name = 'description',
  label = 'Description',
  required = false,
  multiline = true,
  rows = 4,
  maxLength = 2000,
  showCharacterCount = true,
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
    watch,
  } = useFormContext();

  const watchedDescription = watch(name);
  const error = errors[name]?.message as string;
  const isTouched = touchedFields[name];
  const characterCount = watchedDescription?.length || 0;
  const isNearLimit = characterCount > maxLength * 0.8;
  const isOverLimit = characterCount > maxLength;

  const displayHelperText = () => {
    if (error && isTouched) {
      return error;
    }
    
    if (showCharacterCount) {
      if (isOverLimit) {
        return `Description is too long (${characterCount}/${maxLength})`;
      } else if (isNearLimit) {
        return `${characterCount}/${maxLength} characters (approaching limit)`;
      } else {
        return `${characterCount}/${maxLength} characters`;
      }
    }
    
    return helperText || 'Provide a detailed description of your item (optional but recommended)';
  };

  const getHelperTextColor = () => {
    if (error && isTouched) return 'error';
    if (isOverLimit) return 'error';
    if (isNearLimit) return 'warning';
    return 'text.secondary';
  };

  return (
    <Box>
      <Controller
        name={name}
        control={control}
        rules={{
          minLength: {
            value: 10,
            message: 'Description must be at least 10 characters',
          },
          maxLength: {
            value: maxLength,
            message: `Description must be no more than ${maxLength} characters`,
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
            multiline={multiline}
            rows={rows}
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
              <Box>
                <Typography variant="caption" color={getHelperTextColor()}>
                  {displayHelperText()}
                </Typography>
                {showCharacterCount && (
                  <Box
                    sx={{
                      mt: 0.5,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{
                        color: isOverLimit ? 'error.main' : 
                               isNearLimit ? 'warning.main' : 'text.secondary',
                      }}
                    >
                      {required ? 'Minimum 10 characters required' : 'Optional field'}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: isNearLimit || isOverLimit ? 'bold' : 'normal',
                        color: isOverLimit ? 'error.main' : 
                               isNearLimit ? 'warning.main' : 'text.secondary',
                      }}
                    >
                      {characterCount}/{maxLength}
                    </Typography>
                  </Box>
                )}
              </Box>
            }
            inputProps={{
              maxLength,
              ...(props as any).inputProps,
            }}
            {...props}
          />
        )}
      />
    </Box>
  );
};

export default DescriptionField;