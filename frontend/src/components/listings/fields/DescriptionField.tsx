import React from 'react';
import { useFormContext, Controller } from 'react-hook-form';
import { Textarea } from '../../ui/textarea';
import { Label } from '../../ui/label';
import { cn } from '../../../lib/utils';
import type { TextFieldProps } from '../../../types/forms';

/**
 * DescriptionField component for listing descriptions
 * Uses shadcn/ui components
 */
const DescriptionField: React.FC<TextFieldProps> = ({
  name = 'description',
  label = 'Description',
  required = false,
  rows = 4,
  maxLength = 2000,
  showCharacterCount = true,
  helperText,
  className,
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
    return helperText || 'Provide a detailed description of your item (optional but recommended)';
  };

  return (
    <div className={cn("space-y-2", className)}>
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
          <div className="space-y-1">
            <Label 
              htmlFor={name}
              className="text-xs font-bold uppercase tracking-wider text-muted-foreground"
            >
              {label} {required && <span className="text-destructive">*</span>}
            </Label>
            
            <Textarea
              id={name}
              {...field}
              {...props}
              rows={rows}
              maxLength={maxLength}
              className={cn(
                "resize-none",
                fieldState.error && "border-destructive focus-visible:ring-destructive",
                isOverLimit && "border-destructive",
                isNearLimit && !isOverLimit && "border-warning"
              )}
            />

            <div className="flex justify-between items-start text-xs mt-1">
              <span className={cn(
                "text-muted-foreground",
                fieldState.error && "text-destructive"
              )}>
                {displayHelperText()}
              </span>
              
              {showCharacterCount && (
                <div className="flex items-center space-x-2">
                  <span className={cn(
                    "text-muted-foreground",
                    isNearLimit || isOverLimit ? "font-bold" : "",
                    isOverLimit ? "text-destructive" :
                    isNearLimit ? "text-warning" : ""
                  )}>
                    {required ? 'Min 10 chars' : 'Optional'}
                  </span>
                  <span className={cn(
                    "font-mono ml-2",
                    isOverLimit ? "text-destructive font-bold" :
                    isNearLimit ? "text-warning font-bold" : "text-muted-foreground"
                  )}>
                    {characterCount}/{maxLength}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      />
    </div>
  );
};

export default DescriptionField;