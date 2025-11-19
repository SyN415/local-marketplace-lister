import React from 'react';
import { TextField, Box, Typography } from '@mui/material';
import { useFormContext, Controller } from 'react-hook-form';
import type { TextFieldProps } from '../../../types/forms';

/**
 * TitleField component for listing titles with character counter
 * Provides validation and real-time character count feedback
 */
const TitleField: React.FC<TextFieldProps> = ({
  name = 'title',
  label = 'Title',
  required = true,
  maxLength = 100,
  showCharacterCount = true,
  helperText,
  fullWidth = true,
  margin = 'normal',
  variant = 'outlined',
  ...props
}) => {
  const {
    control,
    formState: { errors, touchedFields },
    watch,
  } = useFormContext();

  const watchedTitle = watch(name);
  const error = errors[name]?.message as string;
  const isTouched = touchedFields[name];
  const characterCount = watchedTitle?.length || 0;
  const isNearLimit = characterCount > maxLength * 0.8;
  const isOverLimit = characterCount > maxLength;

  const displayHelperText = () => {
    if (error && isTouched) {
      return error;
    }
    
    if (showCharacterCount) {
      if (isOverLimit) {
        return `Title is too long (${characterCount}/${maxLength})`;
      } else if (isNearLimit) {
        return `${characterCount}/${maxLength} characters (approaching limit)`;
      } else {
        return `${characterCount}/${maxLength} characters`;
      }
    }
    
    return helperText || 'Enter a descriptive title for your listing';
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
          required: required ? 'Title is required' : false,
          minLength: {
            value: 3,
            message: 'Title must be at least 3 characters',
          },
          maxLength: {
            value: maxLength,
            message: `Title must be no more than ${maxLength} characters`,
          },
        }}
        render={({ field, fieldState }) => {
          // Extract error from props to prevent type conflicts
          const { error: _propsError, ...restProps } = props as any;
          return (
            <TextField
              {...field}
              fullWidth={fullWidth}
              label={label}
              required={required}
              margin={margin}
              variant={variant}
              error={Boolean(fieldState.error)}
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
                      Minimum 3 characters required
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
                ...restProps.inputProps,
              }}
              {...restProps}
            />
          );
        }}
      />
      
      {/* Character limit warning */}
      {showCharacterCount && (
        <Box
          sx={{
            mt: 1,
            p: 1,
            bgcolor: isOverLimit ? 'error.light' : 
                     isNearLimit ? 'warning.light' : 'transparent',
            borderRadius: 1,
            border: isNearLimit ? '1px solid' : 'none',
            borderColor: isOverLimit ? 'error.main' : 
                        isNearLimit ? 'warning.main' : 'transparent',
          }}
        >
          <Typography variant="caption" color={isOverLimit ? 'error.dark' : 'text.secondary'}>
            <strong>Tip:</strong> A good title should be clear and descriptive. 
            {isNearLimit && !isOverLimit && ' You\'re getting close to the character limit.'}
            {isOverLimit && ' Please reduce the title length.'}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default TitleField;

/**
 * JSDoc for form integration
 * 
 * @example
 * ```tsx
 * <ListingForm>
 *   <TitleField
 *     name="title"
 *     label="Product Title"
 *     maxLength={100}
 *     showCharacterCount={true}
 *     helperText="Enter a clear, descriptive title"
 *   />
 * </ListingForm>
 * ```
 * 
 * @remarks
 * - Uses React Hook Form Controller for form integration
 * - Provides real-time character count feedback
 * - Shows validation errors with appropriate styling
 * - Includes helpful tips and warnings
 * - Fully responsive and accessible
 */